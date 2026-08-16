import { describe, expect, it } from 'vitest'
import { DEMO_EVIDENCE } from '../src/domain/evidence'
import type { DefectSeverity, SignatureData } from '../src/domain/models'
import {
  BrowserFieldSafeRepository,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import {
  InspectionService,
  InspectionValidationError,
  validateInspectionDraft,
} from '../src/services/inspectionService'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

const STORAGE_KEY = 'fieldsafe:test:inspector-flow'
const SUBMITTED_AT = '2026-08-14T10:30:00.000Z'
const signature: SignatureData = {
  strokes: [[{ x: 0.1, y: 0.6 }, { x: 0.4, y: 0.3 }, { x: 0.8, y: 0.6 }]],
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

function createFlow(storage = new MemoryStorage()) {
  const repository = new BrowserFieldSafeRepository(
    new BrowserStorageAdapter<PersistedOperationalData>(
      STORAGE_KEY,
      () => storage,
    ),
  )
  return {
    repository,
    service: new InspectionService(repository, () => SUBMITTED_AT),
    storage,
  }
}

async function answerAllPass(
  service: InspectionService,
  inspectionId: string,
  inspectorId: string,
) {
  const workspace = await service.getWorkspace(inspectionId, inspectorId)
  for (const item of workspace.items) {
    await service.recordResponse(inspectionId, inspectorId, item.id, 'Pass')
  }
}

async function answerWithFailure(
  service: InspectionService,
  inspectionId: string,
  inspectorId: string,
  severity: DefectSeverity,
) {
  const workspace = await service.getWorkspace(inspectionId, inspectorId)
  const [failedItem, ...passingItems] = workspace.items
  await service.recordResponse(inspectionId, inspectorId, failedItem.id, 'Fail')
  await service.updateDraftDefect(inspectionId, inspectorId, failedItem.id, {
    description: `${severity} hydraulic condition observed`,
    severity,
    evidenceReference: structuredClone(DEMO_EVIDENCE),
  })
  for (const item of passingItems) {
    await service.recordResponse(inspectionId, inspectorId, item.id, 'Pass')
  }
}

describe('Inspector workflow service', () => {
  it('returns only the authenticated Inspector assignments with resolved equipment and checklists', async () => {
    const { service } = createFlow()

    const arjunQueue = await service.getInspectorQueue('USR-INSP-001')
    const nehaQueue = await service.getInspectorQueue('USR-INSP-002')

    expect(arjunQueue).toHaveLength(2)
    expect(nehaQueue).toHaveLength(2)
    expect(arjunQueue.every((item) => item.inspection.inspectorId === 'USR-INSP-001')).toBe(true)
    expect(arjunQueue.every((item) => item.equipment.checklistId === item.checklist.id)).toBe(true)
  })

  it('resolves equipment and equipment-specific checklist content through the repository', async () => {
    const { service } = createFlow()
    const workspace = await service.getWorkspace('ASG-002', 'USR-INSP-001')

    expect(workspace.equipment.assetCode).toBe('TRK-004')
    expect(workspace.checklist.equipmentTypes).toContain('Truck')
    expect(workspace.items).toHaveLength(10)
  })

  it('records PASS without draft defect data', async () => {
    const { service } = createFlow()
    const workspace = await service.getWorkspace('ASG-001', 'USR-INSP-001')

    const draft = await service.recordResponse(
      'ASG-001',
      'USR-INSP-001',
      workspace.items[0].id,
      'Pass',
    )

    expect(draft.responses[0]).toMatchObject({ result: 'Pass', defect: null })
  })

  it('requires description, severity, and evidence for FAIL', async () => {
    const { service } = createFlow()
    const workspace = await service.getWorkspace('ASG-001', 'USR-INSP-001')
    const draft = await service.recordResponse(
      'ASG-001',
      'USR-INSP-001',
      workspace.items[0].id,
      'Fail',
    )

    expect(validateInspectionDraft(workspace.items, draft).itemErrors[workspace.items[0].id]).toEqual([
      'Describe the defect.',
      'Select a severity.',
      'Attach photo evidence.',
    ])
  })

  it('rejects too-short defect descriptions and accepts useful trimmed descriptions', async () => {
    const { service } = createFlow()
    const workspace = await service.getWorkspace('ASG-001', 'USR-INSP-001')
    const item = workspace.items[0]
    await service.recordResponse('ASG-001', 'USR-INSP-001', item.id, 'Fail')
    const shortDraft = await service.updateDraftDefect(
      'ASG-001',
      'USR-INSP-001',
      item.id,
      {
        description: '  a  ',
        severity: 'Major',
        evidenceReference: structuredClone(DEMO_EVIDENCE),
      },
    )

    expect(validateInspectionDraft(workspace.items, shortDraft).itemErrors[item.id]).toContain(
      'Describe what is damaged and where it was observed.',
    )

    const validDraft = await service.updateDraftDefect(
      'ASG-001',
      'USR-INSP-001',
      item.id,
      { description: '  Hose split near coupling  ' },
    )
    expect(validDraft.responses[0].defect?.description).toBe(
      'Hose split near coupling',
    )
    expect(validateInspectionDraft(workspace.items, validDraft).itemErrors[item.id]).toBeUndefined()
  })

  it('derives overdue assignments from the service clock and ranks them first', async () => {
    const { repository } = createFlow()
    const service = new InspectionService(
      repository,
      () => '2026-08-20T12:00:00.000Z',
    )
    const queue = await service.getInspectorQueue('USR-INSP-001')

    expect(queue.some((item) => item.overdue)).toBe(true)
    expect(queue[0].overdue).toBe(true)
    expect(queue.every((item) => item.inspection.status !== 'Completed')).toBe(true)
  })

  it('persists attached demo evidence as a lightweight reference across reconstruction', async () => {
    const flow = createFlow()
    const item = (await flow.service.getWorkspace('ASG-001', 'USR-INSP-001'))
      .items[0]
    await flow.service.recordResponse(
      'ASG-001',
      'USR-INSP-001',
      item.id,
      'Fail',
    )
    await flow.service.updateDraftDefect(
      'ASG-001',
      'USR-INSP-001',
      item.id,
      { evidenceReference: structuredClone(DEMO_EVIDENCE) },
    )

    const reconstructed = createFlow(flow.storage)
    const persistedEvidence = (
      await reconstructed.repository.getInspectionDraft('ASG-001')
    )?.responses[0].defect?.evidenceReference

    expect(persistedEvidence).toEqual(DEMO_EVIDENCE)
    expect(flow.storage.getItem(STORAGE_KEY)).not.toContain('data:image')
  })

  it('removes stale defect data when FAIL changes back to PASS', async () => {
    const { service } = createFlow()
    const item = (await service.getWorkspace('ASG-001', 'USR-INSP-001')).items[0]
    await service.recordResponse('ASG-001', 'USR-INSP-001', item.id, 'Fail')
    await service.updateDraftDefect('ASG-001', 'USR-INSP-001', item.id, {
      description: 'Temporary defect',
      severity: 'Critical',
      evidenceReference: structuredClone(DEMO_EVIDENCE),
    })

    const draft = await service.recordResponse(
      'ASG-001',
      'USR-INSP-001',
      item.id,
      'Pass',
    )

    expect(draft.responses.find((response) => response.checklistItemId === item.id)?.defect).toBeNull()
  })

  it('rejects incomplete checklist submission', async () => {
    const { service } = createFlow()
    await expect(
      service.submitInspection('ASG-001', 'USR-INSP-001'),
    ).rejects.toBeInstanceOf(InspectionValidationError)
  })

  it('requires a signature after all checklist items are complete', async () => {
    const { service } = createFlow()
    await answerAllPass(service, 'ASG-001', 'USR-INSP-001')

    await expect(
      service.submitInspection('ASG-001', 'USR-INSP-001'),
    ).rejects.toBeInstanceOf(InspectionValidationError)
  })

  it('submits an all-PASS inspection and leaves fit equipment FIT', async () => {
    const { service, repository } = createFlow()
    await answerAllPass(service, 'ASG-001', 'USR-INSP-001')
    await service.saveSignature('ASG-001', 'USR-INSP-001', signature)

    const result = await service.submitInspection('ASG-001', 'USR-INSP-001')

    expect(result.inspection.result).toBe('Pass')
    expect(result.inspection.status).toBe('Completed')
    expect(result.equipment.status).toBe('Fit')
    expect(result.defects).toHaveLength(0)
    expect(await repository.getChecklistResponses('ASG-001')).toHaveLength(10)
    expect(await repository.getDefects('ASG-001')).toHaveLength(0)
    expect((await service.getInspectorQueue('USR-INSP-001')).map((item) => item.inspection.id)).not.toContain('ASG-001')
  })

  it('rejects repeated submission without duplicating persisted records', async () => {
    const { service, repository } = createFlow()
    await answerAllPass(service, 'ASG-001', 'USR-INSP-001')
    await service.saveSignature('ASG-001', 'USR-INSP-001', signature)
    await service.submitInspection('ASG-001', 'USR-INSP-001')
    const responsesBefore = await repository.getChecklistResponses('ASG-001')
    const defectsBefore = await repository.getDefects('ASG-001')

    await expect(
      service.submitInspection('ASG-001', 'USR-INSP-001'),
    ).rejects.toThrow('Completed inspections cannot be edited.')

    expect(await repository.getChecklistResponses('ASG-001')).toEqual(
      responsesBefore,
    )
    expect(await repository.getDefects('ASG-001')).toEqual(defectsBefore)
  })

  it('submits Critical FAIL, creates relationally consistent records, and persists OUT OF SERVICE after reconstruction', async () => {
    const flow = createFlow()
    await answerWithFailure(
      flow.service,
      'ASG-002',
      'USR-INSP-001',
      'Critical',
    )
    await flow.service.saveSignature('ASG-002', 'USR-INSP-001', signature)

    const result = await flow.service.submitInspection('ASG-002', 'USR-INSP-001')
    const persistedResponse = (await flow.repository.getChecklistResponses('ASG-002')).find(
      (response) => response.result === 'Fail',
    )

    expect(result.inspection.result).toBe('Fail')
    expect(result.equipment.status).toBe('Out of Service')
    expect(result.defects).toHaveLength(1)
    expect(result.defects[0].checklistResponseId).toBe(persistedResponse?.id)
    expect(result.defects[0].equipmentId).toBe(result.equipment.id)

    const reconstructed = createFlow(flow.storage)
    expect((await reconstructed.repository.getInspectionById('ASG-002'))?.result).toBe('Fail')
    expect((await reconstructed.repository.getEquipmentById(result.equipment.id))?.status).toBe('Out of Service')
    expect(await reconstructed.repository.getInspectionDraft('ASG-002')).toBeNull()
  })

  it('derives RESTRICTED from an unresolved Major defect', async () => {
    const { service } = createFlow()
    await answerWithFailure(service, 'ASG-003', 'USR-INSP-002', 'Major')
    await service.saveSignature('ASG-003', 'USR-INSP-002', signature)

    expect((await service.submitInspection('ASG-003', 'USR-INSP-002')).equipment.status).toBe('Restricted')
  })

  it('keeps equipment FIT for a Minor-only unresolved defect', async () => {
    const { service } = createFlow()
    await answerWithFailure(service, 'ASG-004', 'USR-INSP-002', 'Minor')
    await service.saveSignature('ASG-004', 'USR-INSP-002', signature)

    const result = await service.submitInspection('ASG-004', 'USR-INSP-002')
    expect(result.inspection.result).toBe('Fail')
    expect(result.equipment.status).toBe('Fit')
  })
})
