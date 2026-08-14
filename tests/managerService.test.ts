import { describe, expect, it } from 'vitest'
import { DEMO_EVIDENCE } from '../src/domain/evidence'
import type { SignatureData } from '../src/domain/models'
import { deriveEquipmentStatus } from '../src/domain/safety'
import {
  BrowserFieldSafeRepository,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import { InspectionService } from '../src/services/inspectionService'
import { ManagerService } from '../src/services/managerService'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

const STORAGE_KEY = 'fieldsafe:test:manager-operational'
const NOW = '2026-08-14T12:00:00.000Z'
const signature: SignatureData = {
  strokes: [[{ x: 0.1, y: 0.5 }, { x: 0.8, y: 0.4 }]],
}

class MemoryStorage implements StorageDriver {
  private readonly data = new Map<string, string>()

  getItem(key: string) {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.data.set(key, value)
  }

  removeItem(key: string) {
    this.data.delete(key)
  }
}

function createServices(storage = new MemoryStorage()) {
  const repository = new BrowserFieldSafeRepository(
    new BrowserStorageAdapter<PersistedOperationalData>(
      STORAGE_KEY,
      () => storage,
    ),
  )
  return {
    inspector: new InspectionService(repository, () => NOW),
    manager: new ManagerService(repository, () => NOW),
    repository,
    storage,
  }
}

async function submitCriticalInspection(
  inspector: InspectionService,
  inspectionId = 'ASG-002',
  inspectorId = 'USR-INSP-001',
) {
  const workspace = await inspector.getWorkspace(inspectionId, inspectorId)
  const [failedItem, ...passingItems] = workspace.items
  await inspector.recordResponse(inspectionId, inspectorId, failedItem.id, 'Fail')
  await inspector.updateDraftDefect(inspectionId, inspectorId, failedItem.id, {
    description: 'Manager cross-persona critical safety condition',
    severity: 'Critical',
    evidenceReference: structuredClone(DEMO_EVIDENCE),
  })
  for (const item of passingItems) {
    await inspector.recordResponse(inspectionId, inspectorId, item.id, 'Pass')
  }
  await inspector.saveSignature(inspectionId, inspectorId, signature)
  return inspector.submitInspection(inspectionId, inspectorId)
}

describe('Manager visibility service', () => {
  it('derives overview metrics from repository operational data', async () => {
    const { manager, repository } = createServices()
    const [overview, inspections, defects, equipment] = await Promise.all([
      manager.getOverview(),
      repository.getInspections(),
      repository.getDefects(),
      repository.getEquipment(),
    ])
    const completed = inspections.filter(
      (inspection) => inspection.status === 'Completed',
    )
    const passed = completed.filter((inspection) => inspection.result === 'Pass')

    expect(overview.complianceRate).toBe(
      Math.round((passed.length / completed.length) * 1_000) / 10,
    )
    expect(overview.openDefectCount).toBe(
      defects.filter((defect) => defect.status !== 'Resolved').length,
    )
    expect(overview.totalEquipmentCount).toBe(equipment.length)
    expect(
      Object.values(overview.equipmentStatusCounts).reduce(
        (total, count) => total + count,
        0,
      ),
    ).toBe(equipment.length)
  })

  it('calculates overall, historical, and equipment-type compliance', async () => {
    const { manager } = createServices()
    const analytics = await manager.getComplianceAnalytics()

    expect(analytics.inspectionCount).toBe(60)
    expect(analytics.passedCount).toBe(48)
    expect(analytics.failedCount).toBe(12)
    expect(analytics.complianceRate).toBe(80)
    expect(
      analytics.trend.reduce(
        (total, period) => total + period.inspectionCount,
        0,
      ),
    ).toBe(analytics.inspectionCount)
    expect(analytics.byEquipmentType.map((item) => item.equipmentType)).toEqual([
      'Truck',
      'Crane',
      'Forklift',
      'MEWP',
      'Loader',
    ])
    expect(
      analytics.byEquipmentType.reduce(
        (total, item) => total + item.inspectionCount,
        0,
      ),
    ).toBe(analytics.inspectionCount)
  })

  it('derives defect severity, lifecycle, trend, and category analytics', async () => {
    const { manager, repository } = createServices()
    const analytics = await manager.getDefectAnalytics()
    const defects = await repository.getDefects()

    expect(analytics.totalDefects).toBe(defects.length)
    expect(analytics.severityBreakdown).toEqual({
      Minor: defects.filter((defect) => defect.severity === 'Minor').length,
      Major: defects.filter((defect) => defect.severity === 'Major').length,
      Critical: defects.filter((defect) => defect.severity === 'Critical').length,
    })
    expect(
      analytics.statusBreakdown.open +
        analytics.statusBreakdown.underReview +
        analytics.statusBreakdown.resolved,
    ).toBe(analytics.totalDefects)
    expect(
      analytics.volumeTrend.reduce(
        (total, period) => total + period.defectCount,
        0,
      ),
    ).toBe(analytics.totalDefects)
    expect(analytics.commonCategories.some((item) => item.category === 'Tyres')).toBe(true)
  })

  it('uses canonical unresolved-defect safety state for the equipment board', async () => {
    const { manager, repository } = createServices()
    const equipment = await repository.getEquipmentById('EQ-001')
    expect(equipment).not.toBeNull()
    await repository.saveEquipment({ ...equipment!, status: 'Fit' })

    const board = await manager.getEquipmentBoard()
    const item = board.find((candidate) => candidate.equipment.id === 'EQ-001')
    const defects = (await repository.getDefects()).filter(
      (defect) => defect.equipmentId === 'EQ-001',
    )

    expect(item?.status).toBe(deriveEquipmentStatus(defects))
    expect(item?.status).toBe('Out of Service')
    expect((await repository.getEquipmentById('EQ-001'))?.status).toBe('Fit')
  })

  it('resolves equipment inspection, defect, and corrective-action history', async () => {
    const { manager } = createServices()
    const detail = await manager.getEquipmentDetail('EQ-001')

    expect(detail.equipment.assetCode).toBe('TRK-001')
    expect(detail.inspectionHistory.some((item) => item.inspection.id === 'INS-001')).toBe(true)
    expect(detail.defectContexts.some((item) => item.defect.id === 'DEF-001')).toBe(true)
    expect(detail.defectContexts.find((item) => item.defect.id === 'DEF-001')?.category).toBe('Tyres')
    expect(detail.correctiveActionContexts.some((item) => item.action.id === 'CA-001')).toBe(true)
    expect(detail.correctiveActionContexts.find((item) => item.action.id === 'CA-001')?.owner.name).toBe('Ravi Kumar')
  })

  it('shows a newly submitted Inspector Critical defect as Out of Service for Manager', async () => {
    const flow = createServices()
    const submission = await submitCriticalInspection(flow.inspector)
    const reconstructed = createServices(flow.storage)
    const board = await reconstructed.manager.getEquipmentBoard()
    const item = board.find(
      (candidate) => candidate.equipment.id === submission.equipment.id,
    )
    const detail = await reconstructed.manager.getEquipmentDetail(
      submission.equipment.id,
    )

    expect(item?.status).toBe('Out of Service')
    expect(detail.status).toBe('Out of Service')
    expect(detail.inspectionHistory[0].inspection.id).toBe(submission.inspection.id)
    expect(
      detail.defectContexts.find(
        (context) => context.defect.inspectionId === submission.inspection.id,
      )?.defect,
    ).toMatchObject({
      description: 'Manager cross-persona critical safety condition',
      evidenceReference: DEMO_EVIDENCE,
      severity: 'Critical',
      status: 'Open',
    })
  })

  it('performs read-only queries without changing persisted operational data', async () => {
    const flow = createServices()
    await flow.repository.initialize()
    const before = flow.storage.getItem(STORAGE_KEY)

    await flow.manager.getOverview()
    await flow.manager.getComplianceAnalytics()
    await flow.manager.getDefectAnalytics()
    await flow.manager.getEquipmentBoard()
    await flow.manager.getEquipmentDetail('EQ-001')

    expect(flow.storage.getItem(STORAGE_KEY)).toBe(before)
  })

  it('returns zero analytics for an empty operational dataset', async () => {
    const flow = createServices()
    await flow.repository.initialize()
    const persisted = JSON.parse(flow.storage.getItem(STORAGE_KEY)!) as PersistedOperationalData
    persisted.data.equipment = []
    persisted.data.inspections = []
    persisted.data.checklistResponses = []
    persisted.data.defects = []
    persisted.data.correctiveActions = []
    flow.storage.setItem(STORAGE_KEY, JSON.stringify(persisted))

    const [overview, compliance, defects, equipment] = await Promise.all([
      flow.manager.getOverview(),
      flow.manager.getComplianceAnalytics(),
      flow.manager.getDefectAnalytics(),
      flow.manager.getEquipmentBoard(),
    ])

    expect(overview).toMatchObject({
      complianceRate: 0,
      recentInspectionCount: 0,
      openDefectCount: 0,
      totalEquipmentCount: 0,
      highestRiskEquipment: [],
    })
    expect(compliance).toMatchObject({
      inspectionCount: 0,
      passedCount: 0,
      failedCount: 0,
      complianceRate: 0,
      trend: [],
    })
    expect(defects).toMatchObject({
      totalDefects: 0,
      unresolvedDefects: 0,
      volumeTrend: [],
      commonCategories: [],
    })
    expect(equipment).toEqual([])
  })

  it('degrades missing Manager detail relations without hiding the equipment', async () => {
    const flow = createServices()
    await flow.repository.initialize()
    const persisted = JSON.parse(flow.storage.getItem(STORAGE_KEY)!) as PersistedOperationalData
    persisted.data.checklists = persisted.data.checklists.filter(
      (checklist) => checklist.id !== 'CHK-TRUCK-01',
    )
    persisted.data.users = persisted.data.users.filter(
      (user) => user.id !== 'USR-TECH-001',
    )
    const defect = persisted.data.defects.find((item) => item.id === 'DEF-001')!
    defect.inspectionId = 'MISSING-INSPECTION'
    flow.storage.setItem(STORAGE_KEY, JSON.stringify(persisted))

    const detail = await flow.manager.getEquipmentDetail('EQ-001')

    expect(detail.equipment.assetCode).toBe('TRK-001')
    expect(detail.inspectionHistory[0].checklist).toBeNull()
    expect(
      detail.defectContexts.find((item) => item.defect.id === 'DEF-001')
        ?.inspection,
    ).toBeNull()
    expect(
      detail.correctiveActionContexts.find((item) => item.action.id === 'CA-001')
        ?.owner,
    ).toBeNull()
  })
})
