import { describe, expect, it } from 'vitest'
import { DEMO_EVIDENCE } from '../src/domain/evidence'
import type { SignatureData } from '../src/domain/models'
import {
  BrowserFieldSafeRepository,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import { GateService } from '../src/services/gateService'
import { InspectionService } from '../src/services/inspectionService'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

const STORAGE_KEY = 'fieldsafe:test:gate-operational'
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
    gate: new GateService(repository),
    inspector: new InspectionService(repository, () => NOW),
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
    description: 'Critical condition requiring Gate denial',
    severity: 'Critical',
    evidenceReference: structuredClone(DEMO_EVIDENCE),
  })
  for (const item of passingItems) {
    await inspector.recordResponse(inspectionId, inspectorId, item.id, 'Pass')
  }
  await inspector.saveSignature(inspectionId, inspectorId, signature)
  return inspector.submitInspection(inspectionId, inspectorId)
}

describe('Gate equipment check service', () => {
  it('resolves available equipment from the shared repository', async () => {
    const { gate, repository } = createServices()
    const [options, equipment] = await Promise.all([
      gate.getEquipmentOptions(),
      repository.getEquipment(),
    ])

    expect(options).toHaveLength(equipment.length)
    expect(options.find((item) => item.equipment.id === 'EQ-001')?.equipment.assetCode).toBe('TRK-001')
  })

  it.each([
    { equipmentId: 'EQ-003', status: 'Fit', decision: 'Allowed' },
    { equipmentId: 'EQ-002', status: 'Restricted', decision: 'Restricted' },
    { equipmentId: 'EQ-001', status: 'Out of Service', decision: 'Denied' },
  ] as const)('maps $status to $decision', async ({ equipmentId, status, decision }) => {
    const { gate } = createServices()

    await expect(gate.checkEquipment(equipmentId)).resolves.toMatchObject({
      status,
      decision,
    })
  })

  it('denies a newly failed Critical Inspector asset after repository reconstruction', async () => {
    const flow = createServices()
    const submission = await submitCriticalInspection(flow.inspector)
    const reconstructed = createServices(flow.storage)

    const result = await reconstructed.gate.checkEquipment(
      submission.equipment.id,
    )

    expect(result.equipment.id).toBe(submission.equipment.id)
    expect(result.status).toBe('Out of Service')
    expect(result.decision).toBe('Denied')
    expect(
      (await reconstructed.repository.getInspectionById(
        submission.inspection.id,
      ))?.result,
    ).toBe('Fail')
  })

  it('performs Gate checks without mutating persisted operational data', async () => {
    const flow = createServices()
    await flow.repository.initialize()
    const before = flow.storage.getItem(STORAGE_KEY)

    await flow.gate.getEquipmentOptions()
    await flow.gate.checkEquipment('EQ-001')
    await flow.gate.checkEquipment('EQ-002')
    await flow.gate.checkEquipment('EQ-003')

    expect(flow.storage.getItem(STORAGE_KEY)).toBe(before)
  })
})
