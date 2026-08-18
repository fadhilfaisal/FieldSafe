import {
  deriveEquipmentStatus,
  getHighestDefectSeverity,
} from '../../domain/safety'
import { createSupervisorReviewNotification } from '../../domain/notifications'
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
  InspectorNotification,
  OperationalData,
  User,
} from '../../domain/models'

const DAY_IN_MS = 86_400_000

export function createSeedReferenceDate(now: Date = new Date()) {
  const reference = new Date(now)
  reference.setUTCMinutes(0, 0, 0)
  return reference.toISOString()
}

export const SEED_REFERENCE_DATE = createSeedReferenceDate()

function isoDaysFromReference(
  days: number,
  hourOffset = 0,
  referenceDate = SEED_REFERENCE_DATE,
) {
  return new Date(
    Date.parse(referenceDate) + days * DAY_IN_MS + hourOffset * 3_600_000,
  ).toISOString()
}

function isoInReferenceMonth(
  referenceDate: string,
  monthOffset: number,
  position: number,
  count: number,
) {
  const reference = new Date(referenceDate)
  const monthStart = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth() + monthOffset,
      1,
    ),
  )
  const daysAvailable =
    monthOffset === 0
      ? Math.max(1, reference.getUTCDate() - 1)
      : new Date(
          Date.UTC(
            monthStart.getUTCFullYear(),
            monthStart.getUTCMonth() + 1,
            0,
          ),
        ).getUTCDate()
  const day = Math.max(
    1,
    Math.floor(((position + 1) * daysAvailable) / (count + 1)),
  )
  return new Date(
    Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      day,
      7 + (position % 9),
      30,
    ),
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
  hasAction?: boolean
  reviewStatus?: Inspection['reviewStatus']
  completedOffsetDays?: number
}

const failures: FailureDefinition[] = [
  { inspectionIndex: 0, severity: 'Critical', defectStatus: 'Open', actionStatus: 'Open', dueOffsetDays: -1, reviewStatus: 'Reviewed' },
  { inspectionIndex: 8, severity: 'Major', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -145 },
  { inspectionIndex: 12, severity: 'Critical', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -120 },
  { inspectionIndex: 17, severity: 'Minor', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -112 },
  { inspectionIndex: 22, severity: 'Major', defectStatus: 'Open', actionStatus: 'Open', dueOffsetDays: 4, reviewStatus: 'Reviewed' },
  { inspectionIndex: 28, severity: 'Critical', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -90 },
  { inspectionIndex: 34, severity: 'Major', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -80 },
  { inspectionIndex: 37, severity: 'Minor', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -68 },
  { inspectionIndex: 42, severity: 'Critical', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -62 },
  { inspectionIndex: 45, severity: 'Major', defectStatus: 'Open', actionStatus: 'In Progress', dueOffsetDays: -3, reviewStatus: 'Reviewed' },
  { inspectionIndex: 51, severity: 'Minor', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -48 },
  { inspectionIndex: 54, severity: 'Minor', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -36 },
  { inspectionIndex: 59, severity: 'Major', defectStatus: 'Under Review', actionStatus: 'Open', dueOffsetDays: 1, hasAction: false, reviewStatus: 'Pending Review' },
  { inspectionIndex: 64, severity: 'Minor', defectStatus: 'Open', actionStatus: 'Open', dueOffsetDays: 3, reviewStatus: 'Reviewed' },
  { inspectionIndex: 66, severity: 'Minor', defectStatus: 'Open', actionStatus: 'Open', dueOffsetDays: 0.5, reviewStatus: 'Pending Review' },
  { inspectionIndex: 69, severity: 'Major', defectStatus: 'Resolved', actionStatus: 'Done', dueOffsetDays: -6 },
  { inspectionIndex: 73, severity: 'Major', defectStatus: 'Under Review', actionStatus: 'In Progress', dueOffsetDays: 2, hasAction: false, reviewStatus: 'Pending Review' },
  { inspectionIndex: 77, severity: 'Critical', defectStatus: 'Under Review', actionStatus: 'In Progress', dueOffsetDays: 5, reviewStatus: 'Pending Review' },
  { inspectionIndex: 79, severity: 'Critical', defectStatus: 'Open', actionStatus: 'Done', dueOffsetDays: -2, completedOffsetDays: -0.5, reviewStatus: 'Reviewed' },
]

export const SEED_HISTORICAL_MONTHLY_COUNTS = [11, 14, 12, 15, 13, 15]

function checklistForType(type: EquipmentType) {
  const checklist = checklists.find((candidate) => candidate.equipmentTypes.includes(type))
  if (!checklist) throw new Error(`Missing checklist for ${type}`)
  return checklist
}

export function createSeedAssignedInspections(
  equipment: Equipment[],
  referenceDate = createSeedReferenceDate(),
): Inspection[] {
  const definitions = [
    { id: 'ASG-001', equipmentId: 'EQ-014', inspectorId: 'USR-INSP-001', assignedOffset: -0.5, dueOffset: -1.5 },
    { id: 'ASG-002', equipmentId: 'EQ-004', inspectorId: 'USR-INSP-001', assignedOffset: -1, dueOffset: -0.1 },
    { id: 'ASG-005', equipmentId: 'EQ-003', inspectorId: 'USR-INSP-001', assignedOffset: -2, dueOffset: 0.25 },
    { id: 'ASG-006', equipmentId: 'EQ-009', inspectorId: 'USR-INSP-001', assignedOffset: -3, dueOffset: 1 },
    { id: 'ASG-007', equipmentId: 'EQ-011', inspectorId: 'USR-INSP-001', assignedOffset: -4, dueOffset: 2.5 },
    { id: 'ASG-008', equipmentId: 'EQ-015', inspectorId: 'USR-INSP-001', assignedOffset: -5, dueOffset: 5 },
    { id: 'ASG-003', equipmentId: 'EQ-018', inspectorId: 'USR-INSP-002', assignedOffset: -0.4, dueOffset: -2 },
    { id: 'ASG-004', equipmentId: 'EQ-007', inspectorId: 'USR-INSP-002', assignedOffset: -1.2, dueOffset: -0.2 },
    { id: 'ASG-009', equipmentId: 'EQ-012', inspectorId: 'USR-INSP-002', assignedOffset: -2.2, dueOffset: 0.3 },
    { id: 'ASG-010', equipmentId: 'EQ-013', inspectorId: 'USR-INSP-002', assignedOffset: -3.2, dueOffset: 1.5 },
    { id: 'ASG-011', equipmentId: 'EQ-016', inspectorId: 'USR-INSP-002', assignedOffset: -4.2, dueOffset: 3 },
    { id: 'ASG-012', equipmentId: 'EQ-017', inspectorId: 'USR-INSP-002', assignedOffset: -5.2, dueOffset: 6 },
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
      assignedAt: isoDaysFromReference(
        definition.assignedOffset,
        0,
        referenceDate,
      ),
      dueAt: isoDaysFromReference(definition.dueOffset, 0, referenceDate),
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

function formatNotificationDueAt(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export function createSeedInspectorNotifications(
  inspections: Inspection[],
  equipment: Equipment[],
  availableChecklists: Checklist[],
): InspectorNotification[] {
  const notifications = inspections
    .filter((inspection) => inspection.status !== 'Completed')
    .map((inspection) => {
      const assignedEquipment = equipment.find(
        (item) => item.id === inspection.equipmentId,
      )
      const checklist = availableChecklists.find(
        (item) => item.id === inspection.checklistId,
      )
      if (!assignedEquipment || !checklist) {
        throw new Error(
          `Cannot create an assignment notification for ${inspection.id}.`,
        )
      }

      return {
        id: `NTF-ASSIGNMENT-${inspection.id}`,
        userId: inspection.inspectorId,
        type: 'NEW_ASSIGNMENT',
        title: 'New inspection assigned',
        message: `${assignedEquipment.assetCode} · ${checklist.name} · Due ${formatNotificationDueAt(inspection.dueAt)}`,
        createdAt: inspection.assignedAt,
        readAt: null,
        targetRoute: `/inspector/scan?inspection=${inspection.id}`,
        inspectionId: inspection.id,
      } satisfies InspectorNotification
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return ['USR-INSP-001', 'USR-INSP-002'].flatMap((inspectorId) =>
    notifications
      .filter((notification) => notification.userId === inspectorId)
      .slice(0, 3),
  )
}

export function createSeedSupervisorNotifications(
  inspections: Inspection[],
  equipment: Equipment[],
  availableChecklists: Checklist[],
  defects: Defect[],
): OperationalData['inspectorNotifications'] {
  return inspections
    .filter(
      (inspection) =>
        inspection.status === 'Completed' &&
        inspection.result === 'Fail' &&
        inspection.reviewStatus === 'Pending Review',
    )
    .sort((a, b) =>
      (b.submittedAt ?? b.completedAt ?? '').localeCompare(
        a.submittedAt ?? a.completedAt ?? '',
      ),
    )
    .slice(0, 2)
    .flatMap((inspection) => {
      const assignedEquipment = equipment.find(
        (item) => item.id === inspection.equipmentId,
      )
      const checklist = availableChecklists.find(
        (item) => item.id === inspection.checklistId,
      )
      if (!assignedEquipment || !checklist) return []
      return [
        createSupervisorReviewNotification({
          supervisorId: 'USR-SUP-001',
          inspection,
          equipment: assignedEquipment,
          checklist,
          highestSeverity: getHighestDefectSeverity(
            defects
              .filter((defect) => defect.inspectionId === inspection.id)
              .map((defect) => defect.severity),
          ),
        }),
      ]
    })
}

export function createFieldSafeSeedData(
  referenceDate = createSeedReferenceDate(),
): OperationalData {
  const checklistItems = createChecklistItems()
  const equipment: Equipment[] = equipmentDefinitions.map((definition, index) => ({
    id: `EQ-${String(index + 1).padStart(3, '0')}`,
    ...definition,
    status: 'Fit',
    checklistId: checklistForType(definition.type).id,
    lastInspectionAt: null,
    createdAt: isoDaysFromReference(-240 - index, 0, referenceDate),
  }))

  const failureByInspection = new Map(
    failures.map((failure) => [failure.inspectionIndex, failure]),
  )
  const inspections: Inspection[] = []
  const checklistResponses: OperationalData['checklistResponses'] = []
  const defects: Defect[] = []
  const correctiveActions: CorrectiveAction[] = []

  let index = 0
  SEED_HISTORICAL_MONTHLY_COUNTS.forEach((monthlyCount, monthIndex) => {
    for (let position = 0; position < monthlyCount; position += 1) {
      const inspectedEquipment = equipment[index % equipment.length]
      const checklist = checklists.find(
        (candidate) => candidate.id === inspectedEquipment.checklistId,
      )!
      const items = checklistItems.filter(
        (item) => item.checklistId === checklist.id,
      )
      const failure = failureByInspection.get(index)
      const completedAt = isoInReferenceMonth(
        referenceDate,
        monthIndex - (SEED_HISTORICAL_MONTHLY_COUNTS.length - 1),
        position,
        monthlyCount,
      )
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
        syncStatus: 'SYNCED',
        signature: {
          strokes: [[{ x: 0.14, y: 0.52 }, { x: 0.78, y: 0.44 }]],
        },
        reviewStatus: failure ? failure.reviewStatus ?? 'Reviewed' : null,
        reviewedAt:
          failure && (failure.reviewStatus ?? 'Reviewed') === 'Reviewed'
            ? completedAt
            : null,
        reviewedByUserId:
          failure && (failure.reviewStatus ?? 'Reviewed') === 'Reviewed'
            ? 'USR-SUP-001'
            : null,
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
        failure.defectStatus === 'Resolved'
          ? new Date(Date.parse(completedAt) + 2 * DAY_IN_MS).toISOString()
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

      if (failure.hasAction === false) return

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
        dueAt:
          failure.defectStatus === 'Resolved'
            ? new Date(Date.parse(completedAt) + 5 * DAY_IN_MS).toISOString()
            : isoDaysFromReference(
                failure.dueOffsetDays,
                0,
                referenceDate,
              ),
        completedAt:
          failure.actionStatus === 'Done'
            ? resolvedAt ??
              isoDaysFromReference(
                failure.completedOffsetDays ?? -0.5,
                0,
                referenceDate,
              )
            : null,
      })
      })
      index += 1
    }
  })

  inspections.push(...createSeedAssignedInspections(equipment, referenceDate))

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
    inspectorNotifications: [
      ...createSeedInspectorNotifications(
        inspections,
        equipment,
        checklists,
      ),
      ...createSeedSupervisorNotifications(
        inspections,
        equipment,
        checklists,
        defects,
      ),
    ],
  }
}
