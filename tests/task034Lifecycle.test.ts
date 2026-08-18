import { describe, expect, it } from 'vitest'
import { SEED_REFERENCE_DATE } from '../src/data/seed/fieldSafeSeed'
import { DEMO_EVIDENCE } from '../src/domain/evidence'
import type { SignatureData } from '../src/domain/models'
import { deriveEquipmentStatus } from '../src/domain/safety'
import {
  BrowserFieldSafeRepository,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import { InspectionService } from '../src/services/inspectionService'
import { InspectorNotificationService } from '../src/services/inspectorNotificationService'
import { ManagerService } from '../src/services/managerService'
import {
  SupervisorService,
  SupervisorWorkflowError,
} from '../src/services/supervisorService'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

const STORAGE_KEY = 'fieldsafe:test:task-034'
const NOW = SEED_REFERENCE_DATE
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

function createFlow(storage = new MemoryStorage()) {
  const repository = new BrowserFieldSafeRepository(
    new BrowserStorageAdapter<PersistedOperationalData>(
      STORAGE_KEY,
      () => storage,
    ),
  )
  return {
    repository,
    inspector: new InspectionService(repository, () => NOW),
    inspectorNotifications: new InspectorNotificationService(
      repository,
      () => NOW,
    ),
    manager: new ManagerService(repository, () => NOW),
    supervisor: new SupervisorService(repository, () => NOW),
    storage,
  }
}

async function pendingReviewWithAction(flow: ReturnType<typeof createFlow>) {
  const reviews = await flow.supervisor.getReviews('Pending Review')
  const details = await Promise.all(
    reviews.map((review) =>
      flow.supervisor.getReviewDetail(review.inspection.id),
    ),
  )
  return details.find((review) => review.actions.length > 0)!
}

describe('TASK-034 rejection and Inspector rework lifecycle', () => {
  it('requires a reason and atomically returns retained work to only the originating Inspector', async () => {
    const flow = createFlow()
    const review = await pendingReviewWithAction(flow)
    const equipmentBefore = await flow.repository.getEquipmentById(
      review.equipment.id,
    )
    const defectsBefore = await flow.repository.getDefects(review.inspection.id)

    await expect(
      flow.supervisor.rejectInspectionReview(
        review.inspection.id,
        'USR-SUP-001',
        '   ',
      ),
    ).rejects.toThrow('Reason for revision is required.')

    const rejection = await flow.supervisor.rejectInspectionReview(
      review.inspection.id,
      'USR-SUP-001',
      '  Recheck the reported component and confirm the observation.  ',
    )

    expect(rejection.inspection).toMatchObject({
      id: review.inspection.id,
      inspectorId: review.inspection.inspectorId,
      status: 'In Progress',
      reviewStatus: 'Rework Required',
    })
    expect(rejection.inspection.rejectionHistory).toEqual([
      {
        reason: 'Recheck the reported component and confirm the observation.',
        rejectedByUserId: 'USR-SUP-001',
        rejectedAt: NOW,
        submittedAt: review.inspection.submittedAt,
      },
    ])
    expect(rejection.draft.responses).toHaveLength(review.responses.length)
    expect(rejection.draft.signature).toBeNull()
    expect(
      rejection.draft.responses.find((response) => response.result === 'Fail')
        ?.defect,
    ).toMatchObject({
      description: defectsBefore[0].description,
      severity: defectsBefore[0].severity,
      evidenceReference: DEMO_EVIDENCE,
    })
    expect(
      (await flow.supervisor.getReviews('Pending Review')).some(
        (item) => item.inspection.id === review.inspection.id,
      ),
    ).toBe(false)
    expect(
      (await flow.inspector.getInspectorQueue(review.inspection.inspectorId)).some(
        (item) => item.inspection.id === review.inspection.id,
      ),
    ).toBe(true)
    const otherInspectorId =
      review.inspection.inspectorId === 'USR-INSP-001'
        ? 'USR-INSP-002'
        : 'USR-INSP-001'
    expect(
      (await flow.inspector.getInspectorQueue(otherInspectorId)).some(
        (item) => item.inspection.id === review.inspection.id,
      ),
    ).toBe(false)
    expect(await flow.repository.getDefects(review.inspection.id)).toEqual(
      defectsBefore,
    )
    expect(await flow.repository.getEquipmentById(review.equipment.id)).toEqual(
      equipmentBefore,
    )
  })

  it('creates one durable deep-linked Inspector notification without reconstruction duplicates', async () => {
    const flow = createFlow()
    const review = await pendingReviewWithAction(flow)
    await flow.supervisor.rejectInspectionReview(
      review.inspection.id,
      'USR-SUP-001',
      'Confirm the failed control before resubmitting.',
    )

    const notifications = await flow.inspectorNotifications.getNotifications(
      review.inspection.inspectorId,
    )
    const rework = notifications.filter(
      (notification) =>
        notification.type === 'INSPECTION_REWORK_REQUIRED' &&
        notification.inspectionId === review.inspection.id,
    )
    expect(rework).toHaveLength(1)
    expect(rework[0]).toMatchObject({
      title: 'Inspection returned for revision',
      targetRoute: `/inspector/inspection/${review.inspection.id}`,
      readAt: null,
    })

    const reconstructed = createFlow(flow.storage)
    const afterRefresh = await reconstructed.inspectorNotifications.getNotifications(
      review.inspection.inspectorId,
    )
    expect(
      afterRefresh.filter(
        (notification) =>
          notification.type === 'INSPECTION_REWORK_REQUIRED' &&
          notification.inspectionId === review.inspection.id,
      ),
    ).toHaveLength(1)
    await reconstructed.inspectorNotifications.markRead(
      rework[0].id,
      review.inspection.inspectorId,
    )
    expect(
      (
        await createFlow(flow.storage).inspectorNotifications.getNotifications(
          review.inspection.inspectorId,
        )
      ).find((notification) => notification.id === rework[0].id)?.readAt,
    ).not.toBeNull()
  })

  it('resubmits the same lifecycle and defect identities, then supports normal approval', async () => {
    const flow = createFlow()
    const review = await pendingReviewWithAction(flow)
    const analyticsBefore = await flow.manager.getComplianceAnalytics('all')
    const defectCountBefore = (await flow.repository.getDefects()).length
    const defectIdsBefore = (await flow.repository.getDefects(review.inspection.id))
      .map((defect) => defect.id)
      .sort()

    await flow.supervisor.rejectInspectionReview(
      review.inspection.id,
      'USR-SUP-001',
      'Clarify the observation and reconfirm the checklist.',
    )
    expect((await flow.manager.getComplianceAnalytics('all')).inspectionCount).toBe(
      analyticsBefore.inspectionCount - 1,
    )

    const workspace = await flow.inspector.getWorkspace(
      review.inspection.id,
      review.inspection.inspectorId,
    )
    const failed = workspace.draft!.responses.find(
      (response) => response.result === 'Fail',
    )!
    await flow.inspector.updateDraftDefect(
      review.inspection.id,
      review.inspection.inspectorId,
      failed.checklistItemId,
      { description: 'Reconfirmed component damage with precise location.' },
    )
    await flow.inspector.saveSignature(
      review.inspection.id,
      review.inspection.inspectorId,
      signature,
    )
    const resubmission = await flow.inspector.submitInspection(
      review.inspection.id,
      review.inspection.inspectorId,
    )

    expect(resubmission.inspection).toMatchObject({
      id: review.inspection.id,
      status: 'Completed',
      reviewStatus: 'Pending Review',
      result: 'Fail',
    })
    expect(resubmission.inspection.rejectionHistory).toHaveLength(1)
    expect((await flow.manager.getComplianceAnalytics('all')).inspectionCount).toBe(
      analyticsBefore.inspectionCount,
    )
    expect((await flow.repository.getDefects()).length).toBe(defectCountBefore)
    expect(
      (await flow.repository.getDefects(review.inspection.id))
        .map((defect) => defect.id)
        .sort(),
    ).toEqual(defectIdsBefore)
    expect(
      (await flow.supervisor.getReviews('Pending Review')).some(
        (item) => item.inspection.id === review.inspection.id,
      ),
    ).toBe(true)

    const approved = await flow.supervisor.markReviewReviewed(
      review.inspection.id,
      'USR-SUP-001',
      true,
    )
    expect(approved.reviewStatus).toBe('Reviewed')
    expect(approved.rejectionHistory).toHaveLength(1)
  })
})

describe('TASK-034 Corrective Action closure evidence', () => {
  it('allows work to start but requires persisted evidence for a new Done transition', async () => {
    const flow = createFlow()
    const defects = await flow.repository.getDefects()
    const existingActions = await flow.repository.getCorrectiveActions()
    const defect = defects.find(
      (candidate) =>
        candidate.status !== 'Resolved' &&
        !existingActions.some((action) => action.defectId === candidate.id),
    )!
    const due = new Date(Date.parse(NOW) + 10 * 86_400_000)
      .toISOString()
      .slice(0, 10)
    const action = await flow.supervisor.createCorrectiveAction({
      defectId: defect.id,
      description: 'Repair and function-test the reported safety component.',
      assignedToUserId: 'USR-TECH-001',
      dueDate: due,
      supervisorId: 'USR-SUP-001',
    })

    expect(
      (
        await flow.supervisor.updateCorrectiveActionStatus(
          action.id,
          'In Progress',
        )
      ).status,
    ).toBe('In Progress')
    await expect(
      flow.supervisor.updateCorrectiveActionStatus(action.id, 'Done'),
    ).rejects.toThrow(
      'Attach closure evidence before marking this action Done.',
    )

    const done = await flow.supervisor.updateCorrectiveActionStatus(
      action.id,
      'Done',
      structuredClone(DEMO_EVIDENCE),
    )
    expect(done.status).toBe('Done')
    expect(done.completedAt).toBe(NOW)
    expect(done.closureEvidence).toEqual(DEMO_EVIDENCE)

    const reconstructed = createFlow(flow.storage)
    expect(
      (await reconstructed.supervisor.getActionDetail(action.id)).action
        .closureEvidence,
    ).toEqual(DEMO_EVIDENCE)
    expect(
      (await reconstructed.repository.getDefects()).find(
        (candidate) => candidate.id === defect.id,
      )?.status,
    ).not.toBe('Resolved')

    const resolution = await reconstructed.supervisor.verifyAndResolveDefect(
      action.id,
      'USR-SUP-001',
    )
    expect(resolution.defect.status).toBe('Resolved')
    const equipmentDefects = (await reconstructed.repository.getDefects()).filter(
      (candidate) => candidate.equipmentId === resolution.equipment.id,
    )
    expect(resolution.equipment.status).toBe(
      deriveEquipmentStatus(equipmentDefects),
    )
  })

  it('keeps legacy Done actions without closure evidence readable', async () => {
    const flow = createFlow()
    const legacy = (await flow.supervisor.getActions()).find(
      (item) =>
        item.action.status === 'Done' &&
        !item.action.closureEvidence,
    )!

    expect(legacy.action.completedAt).not.toBeNull()
    expect(legacy.action.closureEvidence).toBeUndefined()
    await expect(
      flow.supervisor.getActionDetail(legacy.action.id),
    ).resolves.toMatchObject({ action: { status: 'Done' } })
  })
})

it('uses the existing workflow error type for invalid lifecycle mutations', () => {
  expect(new SupervisorWorkflowError('invalid').name).toBe(
    'SupervisorWorkflowError',
  )
})
