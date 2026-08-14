import { describe, expect, it } from 'vitest'
import {
  createFieldSafeSeedData,
  SEED_REFERENCE_DATE,
} from '../src/data/seed/fieldSafeSeed'
import { DEMO_EVIDENCE_PUBLIC_URL } from '../src/domain/evidence'
import { deriveEquipmentStatus, isCorrectiveActionOverdue } from '../src/domain/safety'
import {
  BrowserFieldSafeRepository,
  OPERATIONAL_DATA_SCHEMA_VERSION,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

const TEST_STORAGE_KEY = 'fieldsafe:test:operational-data'

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

function createRepository(storage: MemoryStorage) {
  const adapter = new BrowserStorageAdapter<PersistedOperationalData>(
    TEST_STORAGE_KEY,
    () => storage,
  )
  return { adapter, repository: new BrowserFieldSafeRepository(adapter) }
}

describe('deterministic FieldSafe seed data', () => {
  it('creates the required entity counts and date range', () => {
    const seed = createFieldSafeSeedData()
    const passCount = seed.inspections.filter((item) => item.result === 'Pass').length
    const failCount = seed.inspections.filter((item) => item.result === 'Fail').length
    const actionCounts = Object.groupBy(
      seed.correctiveActions,
      (action) => action.status,
    )
    const overdueCount = seed.correctiveActions.filter((action) =>
      isCorrectiveActionOverdue(action, SEED_REFERENCE_DATE),
    ).length
    const completedInspections = seed.inspections.filter(
      (item) => item.completedAt !== null,
    )
    const inspectionTimes = completedInspections.map((item) =>
      Date.parse(item.completedAt!),
    )

    expect(seed.users).toHaveLength(5)
    expect(seed.equipment).toHaveLength(18)
    expect(new Set(seed.equipment.map((item) => item.type))).toEqual(
      new Set(['Truck', 'Crane', 'Forklift', 'MEWP', 'Loader']),
    )
    expect(seed.checklists).toHaveLength(5)
    expect(seed.checklistItems).toHaveLength(50)
    expect(seed.inspections).toHaveLength(64)
    expect(seed.inspections.filter((item) => item.status === 'Assigned')).toHaveLength(4)
    expect(seed.checklistResponses).toHaveLength(600)
    expect(passCount).toBe(48)
    expect(failCount).toBe(12)
    expect(seed.defects).toHaveLength(12)
    expect(seed.correctiveActions).toHaveLength(12)
    expect(actionCounts.Open).toHaveLength(4)
    expect(actionCounts['In Progress']).toHaveLength(4)
    expect(actionCounts.Done).toHaveLength(4)
    expect(overdueCount).toBe(3)
    expect(Math.max(...inspectionTimes)).toBeLessThan(Date.parse(SEED_REFERENCE_DATE))
    expect(Math.min(...inspectionTimes)).toBeGreaterThanOrEqual(
      Date.parse(SEED_REFERENCE_DATE) - 90 * 86_400_000,
    )
  })

  it('is exactly reproducible and relationally consistent', () => {
    const seed = createFieldSafeSeedData()
    expect(seed).toEqual(createFieldSafeSeedData())

    for (const equipment of seed.equipment) {
      const checklist = seed.checklists.find((item) => item.id === equipment.checklistId)
      expect(checklist?.equipmentTypes).toContain(equipment.type)
      expect(equipment.status).toBe(
        deriveEquipmentStatus(
          seed.defects.filter((defect) => defect.equipmentId === equipment.id),
        ),
      )
    }

    for (const inspection of seed.inspections) {
      expect(seed.equipment.some((item) => item.id === inspection.equipmentId)).toBe(true)
      expect(seed.checklists.some((item) => item.id === inspection.checklistId)).toBe(true)
      expect(seed.users.some((item) => item.id === inspection.inspectorId)).toBe(true)
      const defects = seed.defects.filter((item) => item.inspectionId === inspection.id)
      expect(defects.length > 0).toBe(inspection.result === 'Fail')
      if (inspection.status !== 'Completed') {
        expect(inspection.result).toBeNull()
        expect(inspection.completedAt).toBeNull()
      }
    }

    for (const defect of seed.defects) {
      expect(seed.checklistResponses.find((item) => item.id === defect.checklistResponseId)?.result).toBe('Fail')
      const action = seed.correctiveActions.find((item) => item.defectId === defect.id)
      expect(action?.equipmentId).toBe(defect.equipmentId)
      expect(action?.status === 'Done').toBe(defect.status === 'Resolved')
    }
  })
})

describe('BrowserFieldSafeRepository persistence', () => {
  it('initializes once and preserves an operational change across repository recreation', async () => {
    const storage = new MemoryStorage()
    const first = createRepository(storage).repository
    await first.initialize()
    expect(await first.getChecklistResponses()).toHaveLength(600)
    const equipment = (await first.getEquipment())[0]
    await first.saveEquipment({ ...equipment, site: 'Temporary Service Bay' })

    const afterRefresh = createRepository(storage).repository
    await afterRefresh.initialize()

    expect((await afterRefresh.getEquipmentById(equipment.id))?.site).toBe(
      'Temporary Service Bay',
    )
  })

  it('restores the exact seed and resets only the operational storage key', async () => {
    const storage = new MemoryStorage()
    storage.setItem('fieldsafe:unrelated-state', 'preserve-me')
    const { adapter, repository } = createRepository(storage)
    await repository.initialize()
    const equipment = (await repository.getEquipment())[0]
    await repository.saveEquipment({ ...equipment, name: 'Modified Name' })

    await repository.resetDemoData()

    expect(adapter.read()?.data).toEqual(createFieldSafeSeedData())
    expect(storage.getItem('fieldsafe:unrelated-state')).toBe('preserve-me')
  })

  it('returns defensive copies that cannot mutate persisted state', async () => {
    const storage = new MemoryStorage()
    const repository = createRepository(storage).repository
    const firstRead = await repository.getEquipment()
    firstRead[0].name = 'Unpersisted Mutation'

    expect((await repository.getEquipment())[0].name).not.toBe(
      'Unpersisted Mutation',
    )
  })

  it('migrates existing version-one operational data without changing its storage key', async () => {
    const storage = new MemoryStorage()
    const { adapter, repository } = createRepository(storage)
    const legacy = structuredClone(createFieldSafeSeedData())
    legacy.inspections = legacy.inspections
      .filter((inspection) => inspection.status === 'Completed')
      .map((inspection) => {
        const record = { ...inspection } as Record<string, unknown>
        delete record.assignedAt
        delete record.dueAt
        delete record.submittedAt
        delete record.signature
        return record as unknown as typeof inspection
      })
    legacy.defects = legacy.defects.map((defect) => {
      const record = { ...defect } as Record<string, unknown>
      delete record.evidenceReference
      return record as unknown as typeof defect
    })
    delete (legacy as unknown as Record<string, unknown>).inspectionDrafts
    adapter.write({ schemaVersion: 1, data: legacy })

    await repository.initialize()

    expect(adapter.read()?.schemaVersion).toBe(OPERATIONAL_DATA_SCHEMA_VERSION)
    expect(
      (await repository.getInspections()).filter(
        (inspection) => inspection.status === 'Assigned',
      ),
    ).toHaveLength(4)
    expect((await repository.getDefects())[0].evidenceReference).toBeNull()
  })

  it('normalizes stale persisted evidence references without resetting operational data', async () => {
    const storage = new MemoryStorage()
    const { adapter, repository } = createRepository(storage)
    const persisted = createFieldSafeSeedData()
    persisted.equipment[0].site = 'Persisted Custom Site'
    persisted.defects[0].evidenceReference = {
      id: 'demo-hydraulic-hose-damage',
      label: 'Hydraulic hose damage',
      assetPath: '/public/evidence/hydraulic-hose-damage.png',
    }
    persisted.inspectionDrafts = [
      {
        inspectionId: 'ASG-001',
        responses: [
          {
            checklistItemId: 'CLI-MEWP-01',
            result: 'Fail',
            defect: {
              description: 'Damaged hose',
              severity: 'Major',
              evidenceReference: {
                id: 'demo-hydraulic-hose-damage',
                label: 'Hydraulic hose damage',
                assetPath: 'evidence/hydraulic-hose-damage.png',
              },
            },
          },
        ],
        signature: null,
        updatedAt: '2026-08-14T10:00:00.000Z',
      },
    ]
    adapter.write({
      schemaVersion: OPERATIONAL_DATA_SCHEMA_VERSION,
      data: persisted,
    })

    expect((await repository.getDefects())[0].evidenceReference?.assetPath).toBe(
      DEMO_EVIDENCE_PUBLIC_URL,
    )
    expect(
      (await repository.getInspectionDraft('ASG-001'))?.responses[0].defect
        ?.evidenceReference?.assetPath,
    ).toBe(DEMO_EVIDENCE_PUBLIC_URL)
    expect((await repository.getEquipment())[0].site).toBe(
      'Persisted Custom Site',
    )
  })
})
