import { deriveEquipmentStatus } from '../../domain/safety'
import { DEMO_EVIDENCE } from '../../domain/evidence'
import type {
  Checklist,
  ChecklistItem,
  CorrectiveAction,
  CorrectiveActionStatus,
  Defect,
  DefectSeverity,
  DefectStatus,
  Equipment,
  EquipmentType,
  Inspection,
  OperationalData,
  User,
} from '../../domain/models'

export const SEED_REFERENCE_DATE = '2026-08-14T09:00:00.000Z'

const DAY_IN_MS = 86_400_000
const seedReferenceTime = Date.parse(SEED_REFERENCE_DATE)

function isoDaysFromReference(days: number, hourOffset = 0) {
  return new Date(
    seedReferenceTime + days * DAY_IN_MS + hourOffset * 3_600_000,
  ).toISOString()
}

const users: User[] = [
  {
    id: 'USR-INSP-001',
    name: 'Arjun Nair',
    email: 'arjun.nair@fieldsafe.demo',
    role: 'Inspector',
    isActive: true,
  },
  {
    id: 'USR-INSP-002',
    name: 'Neha Patel',
    email: 'neha.patel@fieldsafe.demo',
    role: 'Inspector',
    isActive: true,
  },
  {
    id: 'USR-SUP-001',
    name: 'Priya Sharma',
    email: 'priya.sharma@fieldsafe.demo',
    role: 'Supervisor',
    isActive: true,
  },
  {
    id: 'USR-MGR-001',
    name: 'Varun Mehta',
    email: 'varun.mehta@fieldsafe.demo',
    role: 'Manager',
    isActive: true,
  },
  {
    id: 'USR-TECH-001',
    name: 'Ravi Kumar',
    email: 'ravi.kumar@fieldsafe.demo',
    role: 'Technician',
    isActive: true,
  },
]

const checklists: Checklist[] = [
  { id: 'CHK-TRUCK-01', name: 'Truck Pre-Use Inspection', equipmentTypes: ['Truck'], version: 1, isActive: true },
  { id: 'CHK-CRANE-01', name: 'Crane Pre-Use Inspection', equipmentTypes: ['Crane'], version: 1, isActive: true },
  { id: 'CHK-FORKLIFT-01', name: 'Forklift Pre-Use Inspection', equipmentTypes: ['Forklift'], version: 1, isActive: true },
  { id: 'CHK-MEWP-01', name: 'MEWP Pre-Use Inspection', equipmentTypes: ['MEWP'], version: 1, isActive: true },
  { id: 'CHK-LOADER-01', name: 'Loader Pre-Use Inspection', equipmentTypes: ['Loader'], version: 1, isActive: true },
]

const checklistPrompts: Record<EquipmentType, Array<[string, string, boolean]>> = {
  Truck: [
    ['Tyres', 'Tyres are correctly inflated and free from visible damage', true],
    ['Lights', 'Headlights, indicators, and brake lights operate correctly', false],
    ['Horn', 'Horn is audible and operates correctly', false],
    ['Brakes', 'Service and parking brakes operate correctly', true],
    ['Fluids', 'Fluid levels are correct with no visible leaks', true],
    ['Mirrors', 'Mirrors are secure, clean, and correctly positioned', false],
    ['Seat belt', 'Seat belt fastens and retracts correctly', true],
    ['Body', 'Body, steps, and handholds are secure', false],
    ['Load area', 'Load area is secure and free of loose material', false],
    ['Emergency', 'Emergency equipment is present and serviceable', true],
  ],
  Crane: [
    ['Wire rope', 'Wire rope and reeving show no damage or distortion', true],
    ['Hook', 'Hook, latch, and block are secure and undamaged', true],
    ['Outriggers', 'Outriggers and pads operate and lock correctly', true],
    ['Controls', 'Operating controls return to neutral and are labelled', true],
    ['Limit devices', 'Limit switches and safety devices operate correctly', true],
    ['Hydraulics', 'Hydraulic system shows no leaks or damaged hoses', true],
    ['Brakes', 'Travel and slew brakes operate correctly', true],
    ['Indicators', 'Load indicator and alarms operate correctly', true],
    ['Structure', 'Boom and superstructure show no visible damage', true],
    ['Access', 'Access steps, rails, and cab are safe and clear', false],
  ],
  Forklift: [
    ['Forks', 'Forks and locking pins are undamaged and secure', true],
    ['Mast', 'Mast, chains, and rollers show no visible damage', true],
    ['Hydraulics', 'Hydraulic system operates without leaks', true],
    ['Tyres', 'Tyres and wheels are secure and serviceable', true],
    ['Brakes', 'Service and parking brakes operate correctly', true],
    ['Steering', 'Steering operates smoothly without excess play', false],
    ['Horn', 'Horn and reversing alarm operate correctly', false],
    ['Lights', 'Warning beacon and lights operate correctly', false],
    ['Restraint', 'Operator restraint and seat are secure', true],
    ['Capacity plate', 'Capacity plate is present and legible', true],
  ],
  MEWP: [
    ['Guardrails', 'Platform guardrails and entry gate are secure', true],
    ['Controls', 'Ground and platform controls operate correctly', true],
    ['Emergency stop', 'Emergency stop controls operate correctly', true],
    ['Emergency lowering', 'Emergency lowering system is functional', true],
    ['Tyres', 'Tyres and wheels are serviceable and secure', true],
    ['Hydraulics', 'Hydraulic system shows no leaks or hose damage', true],
    ['Alarms', 'Tilt, travel, and motion alarms operate correctly', true],
    ['Structure', 'Boom, scissor pack, and platform show no damage', true],
    ['Harness point', 'Approved anchor point is present and undamaged', true],
    ['Housekeeping', 'Platform floor is clear and slip resistant', false],
  ],
  Loader: [
    ['Bucket', 'Bucket, cutting edge, and attachment pins are secure', true],
    ['Articulation', 'Articulation joint and steering components are sound', true],
    ['Hydraulics', 'Hydraulic system operates without visible leaks', true],
    ['Tyres', 'Tyres and wheels are secure and serviceable', true],
    ['Brakes', 'Service and parking brakes operate correctly', true],
    ['Steering', 'Steering operates smoothly and predictably', true],
    ['Lights', 'Work lights, indicators, and beacon operate correctly', false],
    ['Horn', 'Horn and reversing alarm operate correctly', false],
    ['Cab', 'Seat belt, mirrors, glass, and access are serviceable', true],
    ['Fire extinguisher', 'Fire extinguisher is present and in date', false],
  ],
}

function createChecklistItems() {
  return checklists.flatMap((checklist) => {
    const equipmentType = checklist.equipmentTypes[0]
    return checklistPrompts[equipmentType].map(
      ([category, prompt, isCritical], index): ChecklistItem => ({
        id: `${checklist.id}-ITEM-${String(index + 1).padStart(2, '0')}`,
        checklistId: checklist.id,
        sequence: index + 1,
        category,
        prompt,
        isCritical,
      }),
    )
  })
}

interface EquipmentDefinition {
  assetCode: string
  name: string
  type: EquipmentType
  manufacturer: string
  model: string
  site: string
}

const equipmentDefinitions: EquipmentDefinition[] = [
  { assetCode: 'TRK-001', name: 'Volvo FMX Dump Truck', type: 'Truck', manufacturer: 'Volvo', model: 'FMX 460', site: 'North Yard' },
  { assetCode: 'TRK-002', name: 'Scania Tipper Truck', type: 'Truck', manufacturer: 'Scania', model: 'G 460', site: 'South Yard' },
  { assetCode: 'TRK-003', name: 'Tata Water Truck', type: 'Truck', manufacturer: 'Tata', model: 'Signa 2823.K', site: 'East Yard' },
  { assetCode: 'TRK-004', name: 'Ashok Leyland Service Truck', type: 'Truck', manufacturer: 'Ashok Leyland', model: 'AVTR 2820', site: 'North Yard' },
  { assetCode: 'CRN-001', name: 'Liebherr Mobile Crane', type: 'Crane', manufacturer: 'Liebherr', model: 'LTM 1050-3.1', site: 'East Yard' },
  { assetCode: 'CRN-002', name: 'Tadano Rough Terrain Crane', type: 'Crane', manufacturer: 'Tadano', model: 'GR-800EX', site: 'North Yard' },
  { assetCode: 'CRN-003', name: 'Kobelco Crawler Crane', type: 'Crane', manufacturer: 'Kobelco', model: 'CKE900G-3', site: 'South Yard' },
  { assetCode: 'FLT-001', name: 'Toyota Counterbalance Forklift', type: 'Forklift', manufacturer: 'Toyota', model: '8FD30', site: 'Warehouse A' },
  { assetCode: 'FLT-002', name: 'Hyster Diesel Forklift', type: 'Forklift', manufacturer: 'Hyster', model: 'H4.0FT5', site: 'Warehouse B' },
  { assetCode: 'FLT-003', name: 'Jungheinrich Electric Forklift', type: 'Forklift', manufacturer: 'Jungheinrich', model: 'EFG 320', site: 'Warehouse A' },
  { assetCode: 'FLT-004', name: 'Godrej Forklift', type: 'Forklift', manufacturer: 'Godrej', model: 'GX 300D', site: 'South Yard' },
  { assetCode: 'MWP-001', name: 'JLG Boom Lift', type: 'MEWP', manufacturer: 'JLG', model: '450AJ', site: 'Plant 1' },
  { assetCode: 'MWP-002', name: 'Genie Scissor Lift', type: 'MEWP', manufacturer: 'Genie', model: 'GS-3246', site: 'Plant 2' },
  { assetCode: 'MWP-003', name: 'Haulotte Vertical Mast', type: 'MEWP', manufacturer: 'Haulotte', model: 'STAR 10', site: 'Warehouse B' },
  { assetCode: 'LDR-001', name: 'Caterpillar Wheel Loader', type: 'Loader', manufacturer: 'Caterpillar', model: '950 GC', site: 'North Yard' },
  { assetCode: 'LDR-002', name: 'Komatsu Wheel Loader', type: 'Loader', manufacturer: 'Komatsu', model: 'WA380-6', site: 'South Yard' },
  { assetCode: 'LDR-003', name: 'JCB Backhoe Loader', type: 'Loader', manufacturer: 'JCB', model: '3DX Plus', site: 'East Yard' },
  { assetCode: 'LDR-004', name: 'Volvo Compact Loader', type: 'Loader', manufacturer: 'Volvo', model: 'L45H', site: 'Plant 2' },
]

interface FailureDefinition {
  inspectionIndex: number
  severity: DefectSeverity
  defectStatus: DefectStatus
  actionStatus: CorrectiveActionStatus
  dueOffsetDays: number
  completedOffsetDays?: number
}

const failures: FailureDefinition[] = [
  { inspectionIndex: 0, severity: 'Critical', defectStatus: 'Open', actionStatus: 'Open', dueOffsetDays: -2 },
  { inspectionIndex: 1, severity: 'Major', defectStatus: 'Under Review', actionStatus: 'In Progress', dueOffsetDays: 3 },
  { inspectionIndex: 2, severity: 'Minor', defectStatus: 'Open', actionStatus: 'Open', dueOffsetDays: 5 },
  { inspectionIndex: 3, severity: 'Critical', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -4, completedOffsetDays: -5 },
  { inspectionIndex: 4, severity: 'Major', defectStatus: 'Open', actionStatus: 'In Progress', dueOffsetDays: -1 },
  { inspectionIndex: 5, severity: 'Critical', defectStatus: 'Under Review', actionStatus: 'In Progress', dueOffsetDays: 2 },
  { inspectionIndex: 6, severity: 'Minor', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -5, completedOffsetDays: -6 },
  { inspectionIndex: 7, severity: 'Major', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -7, completedOffsetDays: -8 },
  { inspectionIndex: 8, severity: 'Critical', defectStatus: 'Open', actionStatus: 'Open', dueOffsetDays: -3 },
  { inspectionIndex: 9, severity: 'Major', defectStatus: 'Under Review', actionStatus: 'In Progress', dueOffsetDays: 4 },
  { inspectionIndex: 10, severity: 'Minor', defectStatus: 'Open', actionStatus: 'Open', dueOffsetDays: 6 },
  { inspectionIndex: 11, severity: 'Critical', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -9, completedOffsetDays: -10 },
]

function checklistForType(type: EquipmentType) {
  const checklist = checklists.find((candidate) => candidate.equipmentTypes.includes(type))
  if (!checklist) throw new Error(`Missing checklist for ${type}`)
  return checklist
}

export function createSeedAssignedInspections(
  equipment: Equipment[],
): Inspection[] {
  const definitions = [
    { id: 'ASG-001', equipmentId: 'EQ-014', inspectorId: 'USR-INSP-001', dueOffset: 0.25 },
    { id: 'ASG-002', equipmentId: 'EQ-004', inspectorId: 'USR-INSP-001', dueOffset: 0.5 },
    { id: 'ASG-003', equipmentId: 'EQ-018', inspectorId: 'USR-INSP-002', dueOffset: 0.35 },
    { id: 'ASG-004', equipmentId: 'EQ-007', inspectorId: 'USR-INSP-002', dueOffset: 1 },
  ]

  return definitions.map((definition) => {
    const assignedEquipment = equipment.find(
      (item) => item.id === definition.equipmentId,
    )
    if (!assignedEquipment) {
      throw new Error(`Missing assigned equipment ${definition.equipmentId}.`)
    }

    return {
      id: definition.id,
      equipmentId: assignedEquipment.id,
      checklistId: assignedEquipment.checklistId,
      inspectorId: definition.inspectorId,
      status: 'Assigned',
      result: null,
      assignedAt: isoDaysFromReference(-1),
      dueAt: isoDaysFromReference(definition.dueOffset),
      startedAt: null,
      completedAt: null,
      submittedAt: null,
      signature: null,
      syncStatus: 'SYNCED',
      reviewStatus: null,
      reviewedAt: null,
      reviewedByUserId: null,
    }
  })
}

export function createFieldSafeSeedData(): OperationalData {
  const checklistItems = createChecklistItems()
  const equipment: Equipment[] = equipmentDefinitions.map((definition, index) => ({
    id: `EQ-${String(index + 1).padStart(3, '0')}`,
    ...definition,
    status: 'Fit',
    checklistId: checklistForType(definition.type).id,
    lastInspectionAt: null,
    createdAt: isoDaysFromReference(-180 - index),
  }))

  const failureByInspection = new Map(
    failures.map((failure) => [failure.inspectionIndex, failure]),
  )
  const inspections: Inspection[] = []
  const checklistResponses: OperationalData['checklistResponses'] = []
  const defects: Defect[] = []
  const correctiveActions: CorrectiveAction[] = []

  for (let index = 0; index < 60; index += 1) {
    const inspectedEquipment = equipment[index % equipment.length]
    const checklist = checklists.find(
      (candidate) => candidate.id === inspectedEquipment.checklistId,
    )!
    const items = checklistItems.filter((item) => item.checklistId === checklist.id)
    const failure = failureByInspection.get(index)
    const daysAgo = 1 + Math.floor((index * 88) / 59)
    const completedAt = isoDaysFromReference(-daysAgo, -(index % 7))
    const startedAt = new Date(
      Date.parse(completedAt) - 35 * 60_000,
    ).toISOString()
    const inspectionId = `INS-${String(index + 1).padStart(3, '0')}`
    const failedItemIndex = failure ? index % items.length : -1

    inspections.push({
      id: inspectionId,
      equipmentId: inspectedEquipment.id,
      checklistId: checklist.id,
      inspectorId: index % 2 === 0 ? 'USR-INSP-001' : 'USR-INSP-002',
      status: 'Completed',
      result: failure ? 'Fail' : 'Pass',
      assignedAt: new Date(Date.parse(startedAt) - DAY_IN_MS).toISOString(),
      dueAt: completedAt,
      startedAt,
      completedAt,
      submittedAt: completedAt,
      signature: null,
      syncStatus: 'SYNCED',
      reviewStatus: index < 8 ? 'Pending Review' : 'Reviewed',
      reviewedAt: index < 8 ? null : completedAt,
      reviewedByUserId: index < 8 ? null : 'USR-SUP-001',
    })

    items.forEach((item, itemIndex) => {
      const responseId = `RSP-${String(index + 1).padStart(3, '0')}-${String(itemIndex + 1).padStart(2, '0')}`
      const failed = itemIndex === failedItemIndex
      checklistResponses.push({
        id: responseId,
        inspectionId,
        checklistItemId: item.id,
        result: failed ? 'Fail' : 'Pass',
        ...(failed ? { notes: `${item.category} did not meet the required safety standard.` } : {}),
      })

      if (!failed || !failure) return

      const defectNumber = defects.length + 1
      const defectId = `DEF-${String(defectNumber).padStart(3, '0')}`
      const resolvedAt =
        failure.defectStatus === 'Resolved' && failure.completedOffsetDays !== undefined
          ? isoDaysFromReference(failure.completedOffsetDays)
          : null

      defects.push({
        id: defectId,
        inspectionId,
        equipmentId: inspectedEquipment.id,
        checklistResponseId: responseId,
        reportedByUserId: index % 2 === 0 ? 'USR-INSP-001' : 'USR-INSP-002',
        title: `${item.category} condition requires attention`,
        description: `${inspectedEquipment.assetCode} failed the ${item.category.toLowerCase()} check during its scheduled inspection.`,
        severity: failure.severity,
        evidenceReference: structuredClone(DEMO_EVIDENCE),
        status: failure.defectStatus,
        reportedAt: completedAt,
        resolvedAt,
        resolvedByUserId: resolvedAt ? 'USR-SUP-001' : null,
      })

      correctiveActions.push({
        id: `CA-${String(defectNumber).padStart(3, '0')}`,
        defectId,
        equipmentId: inspectedEquipment.id,
        assignedToUserId: 'USR-TECH-001',
        createdByUserId: 'USR-SUP-001',
        title: `Correct ${item.category.toLowerCase()} defect`,
        description: `Inspect and repair the reported ${item.category.toLowerCase()} condition, then confirm serviceability.`,
        status: failure.actionStatus,
        createdAt: new Date(Date.parse(completedAt) + 2 * 60 * 60_000).toISOString(),
        dueAt: isoDaysFromReference(failure.dueOffsetDays),
        completedAt: resolvedAt,
      })
    })
  }

  inspections.push(...createSeedAssignedInspections(equipment))

  equipment.forEach((item) => {
    const latestInspection = inspections
      .filter(
        (inspection) =>
          inspection.equipmentId === item.id && inspection.completedAt !== null,
      )
      .sort((a, b) =>
        (b.completedAt ?? '').localeCompare(a.completedAt ?? ''),
      )[0]
    item.lastInspectionAt = latestInspection?.completedAt ?? null
    item.status = deriveEquipmentStatus(
      defects.filter((defect) => defect.equipmentId === item.id),
    )
  })

  return {
    simulatedConnectivity: 'ONLINE',
    users: structuredClone(users),
    equipment,
    checklists: structuredClone(checklists),
    checklistItems,
    inspections,
    checklistResponses,
    defects,
    correctiveActions,
    inspectionDrafts: [],
  }
}
