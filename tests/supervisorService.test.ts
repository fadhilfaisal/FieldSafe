import { describe, expect, it } from 'vitest'
import { AuthService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'
import {
  BrowserSessionStore,
  type PersistedSession,
} from '../src/auth/sessionStore'
import { DEMO_EVIDENCE } from '../src/domain/evidence'
import { SEED_REFERENCE_DATE } from '../src/data/seed/fieldSafeSeed'
import type { SignatureData } from '../src/domain/models'
import { isCorrectiveActionOverdue } from '../src/domain/safety'
import {
  BrowserFieldSafeRepository,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import { InspectionService } from '../src/services/inspectionService'
import { GateService } from '../src/services/gateService'
import { ManagerService } from '../src/services/managerService'
import {
  RECENT_PASSED_INSPECTION_LIMIT,
  SupervisorReviewConfirmationRequired,
  SupervisorService,
} from '../src/services/supervisorService'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

const OPERATIONAL_KEY = 'fieldsafe:test:supervisor-operational'
const SESSION_KEY = 'fieldsafe:test:supervisor-session'
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

function createServices(storage = new MemoryStorage()) {
  const repository = new BrowserFieldSafeRepository(
    new BrowserStorageAdapter<PersistedOperationalData>(
      OPERATIONAL_KEY,
      () => storage,
    ),
  )
  const sessions = new BrowserSessionStore(
    new BrowserStorageAdapter<PersistedSession>(SESSION_KEY, () => storage),
  )
  return {
    auth: new AuthService(repository, sessions),
    gate: new GateService(repository),
    inspector: new InspectionService(repository, () => NOW),
    manager: new ManagerService(repository, () => NOW),
    repository,
    sessions,
    storage,
    supervisor: new SupervisorService(repository, () => NOW),
  }
}

async function submitInspectionWithDefects(
  inspector: InspectionService,
  severities: Array<'Minor' | 'Major' | 'Critical'>,
  inspectionId = 'ASG-001',
) {
  const inspectorId = 'USR-INSP-001'
  const workspace = await inspector.getWorkspace(inspectionId, inspectorId)

  for (const [index, item] of workspace.items.entries()) {
    const severity = severities[index]
    if (!severity) {
      await inspector.recordResponse(inspectionId, inspectorId, item.id, 'Pass')
      continue
    }
    await inspector.recordResponse(inspectionId, inspectorId, item.id, 'Fail')
    await inspector.updateDraftDefect(inspectionId, inspectorId, item.id, {
      description: `${severity} defect requiring remediation verification`,
      severity,
      evidenceReference: structuredClone(DEMO_EVIDENCE),
    })
  }
  await inspector.saveSignature(inspectionId, inspectorId, signature)
  return inspector.submitInspection(inspectionId, inspectorId)
}

async function createActionForDefect(
  supervisor: SupervisorService,
  defectId: string,
) {
  return supervisor.createCorrectiveAction({
    defectId,
    description: 'Complete corrective work and prepare for verification.',
    assignedToUserId: 'USR-TECH-001',
    dueDate: '2026-08-21',
    supervisorId: 'USR-SUP-001',
  })
}

async function submitCriticalInspection(
  inspector: InspectionService,
  inspectionId = 'ASG-002',
  inspectorId = 'USR-INSP-001',
) {
  const workspace = await inspector.getWorkspace(inspectionId, inspectorId)
  const [failedItem, ...passingItems] = workspace.items
  await inspector.recordResponse(
    inspectionId,
    inspectorId,
    failedItem.id,
    'Fail',
  )
  await inspector.updateDraftDefect(
    inspectionId,
    inspectorId,
    failedItem.id,
    {
      description: 'Critical hydraulic hose damage from Inspector workflow',
      severity: 'Critical',
      evidenceReference: structuredClone(DEMO_EVIDENCE),
    },
  )
  for (const item of passingItems) {
    await inspector.recordResponse(
      inspectionId,
      inspectorId,
      item.id,
      'Pass',
    )
  }
  await inspector.saveSignature(inspectionId, inspectorId, signature)
  return inspector.submitInspection(inspectionId, inspectorId)
}

describe('Supervisor review and corrective action service', () => {
  it('returns seeded pending reviews prioritized by severity', async () => {
    const { supervisor } = createServices()

    const reviews = await supervisor.getReviews('Pending Review')

    expect(reviews).toHaveLength(4)
    expect(reviews[0].highestSeverity).toBe('Critical')
    expect(reviews.every((review) => review.inspection.status === 'Completed')).toBe(true)
    expect(reviews.every((review) => review.equipment.id === review.inspection.equipmentId)).toBe(true)
  })

  it('resolves review responses, failed defects, and evidence relationally', async () => {
    const { supervisor } = createServices()

    const review = await supervisor.getReviewDetail('INS-001')
    const failed = review.responses.find(
      (item) => item.response.result === 'Fail',
    )

    expect(review.inspector.name).toBe('Arjun Nair')
    expect(review.responses).toHaveLength(10)
    expect(failed?.defect?.checklistResponseId).toBe(failed?.response.id)
    expect(failed?.defect?.evidenceReference).toEqual(DEMO_EVIDENCE)
    expect(review.failedCount).toBe(1)
  })

  it('exposes a newly submitted Inspector failure in the same Supervisor repository', async () => {
    const { inspector, supervisor } = createServices()
    const submission = await submitCriticalInspection(inspector)

    const reviews = await supervisor.getReviews('Pending Review')
    const newReview = reviews.find(
      (review) => review.inspection.id === submission.inspection.id,
    )
    const detail = await supervisor.getReviewDetail(submission.inspection.id)

    expect(newReview?.highestSeverity).toBe('Critical')
    expect(newReview?.equipment.status).toBe('Out of Service')
    expect(detail.responses.find((item) => item.defect)?.defect?.description).toContain(
      'Critical hydraulic hose damage',
    )
    expect(detail.responses.find((item) => item.defect)?.defect?.evidenceReference).toEqual(
      DEMO_EVIDENCE,
    )
    expect(
      (await supervisor.getDashboard()).recentPassedInspections.some(
        (item) => item.inspection.id === submission.inspection.id,
      ),
    ).toBe(false)
  })

  it('keeps an all-pass submission out of reviews and visible in capped recent passes after reconstruction', async () => {
    const flow = createServices()
    const pendingBefore = (await flow.supervisor.getDashboard()).pendingReviews.length
    const submission = await submitInspectionWithDefects(
      flow.inspector,
      [],
      'ASG-001',
    )

    expect(submission.inspection).toMatchObject({
      status: 'Completed',
      result: 'Pass',
      reviewStatus: null,
    })
    expect(submission.defects).toHaveLength(0)
    expect(await flow.repository.getDefects(submission.inspection.id)).toHaveLength(0)
    expect(submission.equipment.status).toBe('Fit')
    const dashboard = await flow.supervisor.getDashboard()
    expect(dashboard.pendingReviews).toHaveLength(pendingBefore)
    expect(
      dashboard.pendingReviews.some(
        (item) => item.inspection.id === submission.inspection.id,
      ),
    ).toBe(false)
    expect(
      dashboard.recentPassedInspections.find(
        (item) => item.inspection.id === submission.inspection.id,
      )?.inspection.result,
    ).toBe('Pass')
    expect(dashboard.recentPassedInspections).toHaveLength(
      RECENT_PASSED_INSPECTION_LIMIT,
    )
    expect(
      dashboard.recentPassedInspections.every(
        (item) =>
          item.inspection.result === 'Pass' &&
          item.failedCount === 0 &&
          item.defects.length === 0 &&
          item.inspection.reviewStatus !== 'Pending Review',
      ),
    ).toBe(true)
    expect(
      dashboard.recentPassedInspections.map(
        (item) => item.inspection.submittedAt,
      ),
    ).toEqual(
      dashboard.recentPassedInspections
        .map((item) => item.inspection.submittedAt)
        .slice()
        .sort((left, right) => (right ?? '').localeCompare(left ?? '')),
    )
    await expect(
      flow.supervisor.markReviewReviewed(
        submission.inspection.id,
        'USR-SUP-001',
      ),
    ).rejects.toThrow('Passed inspections do not require Supervisor review.')
    expect(
      (await flow.manager.getEquipmentDetail(submission.equipment.id)).status,
    ).toBe('Fit')
    expect(
      (await flow.gate.checkEquipment(submission.equipment.id)).decision,
    ).toBe('Allowed')

    const reconstructed = createServices(flow.storage)
    expect(
      (
        await reconstructed.supervisor.getDashboard()
      ).recentPassedInspections.some(
        (item) => item.inspection.id === submission.inspection.id,
      ),
    ).toBe(true)
    expect(
      await reconstructed.repository.getInspectionById(
        submission.inspection.id,
      ),
    ).toMatchObject({ status: 'Completed', result: 'Pass' })
  })

  it('marks a review as reviewed and reconstructs the persisted lifecycle', async () => {
    const flow = createServices()
    const pendingReviews = await flow.supervisor.getReviews('Pending Review')
    const pending = (
      await Promise.all(
        pendingReviews.map((review) =>
          flow.supervisor.getReviewDetail(review.inspection.id),
        ),
      )
    ).find((review) => review.actions.length > 0)!
    await flow.supervisor.markReviewReviewed(
      pending.inspection.id,
      'USR-SUP-001',
    )

    const reconstructed = createServices(flow.storage)
    const inspection = await reconstructed.repository.getInspectionById(
      pending.inspection.id,
    )

    expect(inspection?.reviewStatus).toBe('Reviewed')
    expect(inspection?.reviewedAt).toBe(NOW)
    expect(inspection?.reviewedByUserId).toBe('USR-SUP-001')
    expect(
      (await reconstructed.supervisor.getReviews('Pending Review')).some(
        (review) => review.inspection.id === pending.inspection.id,
      ),
    ).toBe(false)
  })

  it('creates a persisted action for the seeded Technician from a new Inspector defect', async () => {
    const flow = createServices()
    const submission = await submitCriticalInspection(flow.inspector)
    const defect = submission.defects[0]
    const technicians = await flow.supervisor.getTechnicians()

    const action = await flow.supervisor.createCorrectiveAction({
      defectId: defect.id,
      description: 'Replace damaged hose and pressure-test the repaired circuit.',
      assignedToUserId: technicians[0].id,
      dueDate: '2026-08-20',
      supervisorId: 'USR-SUP-001',
    })
    const reconstructed = createServices(flow.storage)
    const detail = await reconstructed.supervisor.getActionDetail(action.id)

    expect(technicians).toHaveLength(1)
    expect(technicians[0].name).toBe('Ravi Kumar')
    expect(action.status).toBe('Open')
    expect(detail.owner.id).toBe(technicians[0].id)
    expect(detail.defect.id).toBe(defect.id)
    expect(detail.action.dueAt).toBe('2026-08-20T23:59:59.999Z')
  })

  it('uses the canonical overdue helper for action attention state', async () => {
    const { supervisor } = createServices()
    const actions = await supervisor.getActions()

    expect(actions.filter((item) => item.overdue)).toHaveLength(2)
    expect(
      actions.every(
        (item) => item.overdue === isCorrectiveActionOverdue(item.action, NOW),
      ),
    ).toBe(true)
  })

  it('updates action lifecycle without resolving the defect or changing equipment safety state', async () => {
    const flow = createServices()
    const submission = await submitCriticalInspection(flow.inspector)
    const defect = submission.defects[0]
    const action = await flow.supervisor.createCorrectiveAction({
      defectId: defect.id,
      description: 'Replace and test the failed safety component.',
      assignedToUserId: 'USR-TECH-001',
      dueDate: '2026-08-21',
      supervisorId: 'USR-SUP-001',
    })

    expect(
      (await flow.supervisor.updateCorrectiveActionStatus(action.id, 'In Progress')).status,
    ).toBe('In Progress')
    expect(
      (await flow.supervisor.updateCorrectiveActionStatus(action.id, 'Done')).status,
    ).toBe('Done')

    const persistedDefect = (await flow.repository.getDefects()).find(
      (item) => item.id === defect.id,
    )
    const equipment = await flow.repository.getEquipmentById(
      submission.equipment.id,
    )
    expect(persistedDefect?.status).toBe('Open')
    expect(persistedDefect?.resolvedAt).toBeNull()
    expect(equipment?.status).toBe('Out of Service')
  })

  it('rejects defect resolution until the related corrective action is Done', async () => {
    const flow = createServices()
    const submission = await submitInspectionWithDefects(flow.inspector, [
      'Critical',
    ])
    const action = await createActionForDefect(
      flow.supervisor,
      submission.defects[0].id,
    )

    await expect(
      flow.supervisor.verifyAndResolveDefect(action.id, 'USR-SUP-001'),
    ).rejects.toThrow(
      'Corrective work must be marked Done before defect verification.',
    )
    expect(
      (await flow.repository.getDefects(submission.inspection.id))[0].status,
    ).toBe('Open')
    expect(
      (await flow.repository.getEquipmentById(submission.equipment.id))?.status,
    ).toBe('Out of Service')
  })

  it('verifies a completed remediation, persists provenance, and updates Gate and Manager', async () => {
    const flow = createServices()
    const submission = await submitInspectionWithDefects(flow.inspector, [
      'Critical',
    ])
    const action = await createActionForDefect(
      flow.supervisor,
      submission.defects[0].id,
    )
    await flow.supervisor.updateCorrectiveActionStatus(action.id, 'Done')

    expect(
      (await flow.gate.checkEquipment(submission.equipment.id)).decision,
    ).toBe('Denied')
    const resolution = await flow.supervisor.verifyAndResolveDefect(
      action.id,
      'USR-SUP-001',
    )

    expect(resolution.defect).toMatchObject({
      status: 'Resolved',
      resolvedAt: NOW,
      resolvedByUserId: 'USR-SUP-001',
    })
    expect(resolution.equipment.status).toBe('Fit')
    expect(
      (await flow.gate.checkEquipment(submission.equipment.id)).decision,
    ).toBe('Allowed')
    expect(
      (
        await flow.manager.getEquipmentBoard()
      ).find((item) => item.equipment.id === submission.equipment.id)?.status,
    ).toBe('Fit')

    const reconstructed = createServices(flow.storage)
    expect(
      (
        await reconstructed.repository.getDefects(submission.inspection.id)
      )[0],
    ).toMatchObject({
      status: 'Resolved',
      resolvedAt: NOW,
      resolvedByUserId: 'USR-SUP-001',
    })
    expect(
      (await reconstructed.gate.checkEquipment(submission.equipment.id))
        .decision,
    ).toBe('Allowed')
  })

  it('recalculates to Restricted when a Major defect remains unresolved', async () => {
    const flow = createServices()
    const submission = await submitInspectionWithDefects(flow.inspector, [
      'Critical',
      'Major',
    ])
    const criticalDefect = submission.defects.find(
      (defect) => defect.severity === 'Critical',
    )!
    const action = await createActionForDefect(
      flow.supervisor,
      criticalDefect.id,
    )
    await flow.supervisor.updateCorrectiveActionStatus(action.id, 'Done')

    const resolution = await flow.supervisor.verifyAndResolveDefect(
      action.id,
      'USR-SUP-001',
    )

    expect(resolution.equipment.status).toBe('Restricted')
    expect(
      (await flow.gate.checkEquipment(submission.equipment.id)).decision,
    ).toBe('Restricted')
  })

  it('remains Out of Service when another Critical defect is unresolved', async () => {
    const flow = createServices()
    const submission = await submitInspectionWithDefects(flow.inspector, [
      'Critical',
      'Critical',
    ])
    const action = await createActionForDefect(
      flow.supervisor,
      submission.defects[0].id,
    )
    await flow.supervisor.updateCorrectiveActionStatus(action.id, 'Done')

    const resolution = await flow.supervisor.verifyAndResolveDefect(
      action.id,
      'USR-SUP-001',
    )

    expect(resolution.equipment.status).toBe('Out of Service')
    expect(
      (await flow.gate.checkEquipment(submission.equipment.id)).decision,
    ).toBe('Denied')
  })

  it('rejects a duplicate defect resolution without changing persisted state', async () => {
    const flow = createServices()
    const submission = await submitInspectionWithDefects(flow.inspector, [
      'Critical',
    ])
    const action = await createActionForDefect(
      flow.supervisor,
      submission.defects[0].id,
    )
    await flow.supervisor.updateCorrectiveActionStatus(action.id, 'Done')
    await flow.supervisor.verifyAndResolveDefect(action.id, 'USR-SUP-001')
    const before = flow.storage.getItem(OPERATIONAL_KEY)

    await expect(
      flow.supervisor.verifyAndResolveDefect(action.id, 'USR-SUP-001'),
    ).rejects.toThrow('This defect has already been resolved.')
    expect(flow.storage.getItem(OPERATIONAL_KEY)).toBe(before)
  })

  it('warns before review acknowledgement but preserves remediation recovery after Review', async () => {
    const flow = createServices()
    const submission = await submitInspectionWithDefects(flow.inspector, [
      'Critical',
    ])

    await expect(
      flow.supervisor.markReviewReviewed(
        submission.inspection.id,
        'USR-SUP-001',
      ),
    ).rejects.toBeInstanceOf(SupervisorReviewConfirmationRequired)
    expect(
      (await flow.repository.getInspectionById(submission.inspection.id))
        ?.reviewStatus,
    ).toBe('Pending Review')

    await flow.supervisor.markReviewReviewed(
      submission.inspection.id,
      'USR-SUP-001',
      true,
    )
    const reviewedWithoutAction = await flow.supervisor.getReviewDetail(
      submission.inspection.id,
    )
    expect(reviewedWithoutAction.inspection.reviewStatus).toBe('Reviewed')
    expect(reviewedWithoutAction.unassignedUnresolvedDefectCount).toBe(1)
    expect(reviewedWithoutAction.actions).toHaveLength(0)

    const action = await createActionForDefect(
      flow.supervisor,
      submission.defects[0].id,
    )
    const recoveredReview = await flow.supervisor.getReviewDetail(
      submission.inspection.id,
    )
    expect(recoveredReview.actions.map((item) => item.id)).toContain(action.id)
    expect(recoveredReview.unassignedUnresolvedDefectCount).toBe(0)
  })

  it('does not permit duplicate remediation for a resolved reviewed defect', async () => {
    const flow = createServices()
    const submission = await submitInspectionWithDefects(flow.inspector, [
      'Critical',
    ])
    await flow.supervisor.markReviewReviewed(
      submission.inspection.id,
      'USR-SUP-001',
      true,
    )
    const action = await createActionForDefect(
      flow.supervisor,
      submission.defects[0].id,
    )
    await flow.supervisor.updateCorrectiveActionStatus(action.id, 'Done')
    await flow.supervisor.verifyAndResolveDefect(action.id, 'USR-SUP-001')

    const reviewed = await flow.supervisor.getReviewDetail(
      submission.inspection.id,
    )
    expect(reviewed.responses.find((item) => item.defect)?.defect?.status).toBe(
      'Resolved',
    )
    await expect(
      createActionForDefect(flow.supervisor, submission.defects[0].id),
    ).rejects.toThrow('Open defect not found.')
  })

  it('Demo Reset removes test-time resolutions and restores deterministic baseline', async () => {
    const flow = createServices()
    const baselineEquipment = await flow.repository.getEquipmentById('EQ-014')
    const submission = await submitInspectionWithDefects(flow.inspector, [
      'Critical',
    ])
    const action = await createActionForDefect(
      flow.supervisor,
      submission.defects[0].id,
    )
    await flow.supervisor.updateCorrectiveActionStatus(action.id, 'Done')
    await flow.supervisor.verifyAndResolveDefect(action.id, 'USR-SUP-001')

    await flow.repository.resetDemoData()

    expect(await flow.repository.getInspectionById('ASG-001')).toMatchObject({
      status: 'Assigned',
      result: null,
    })
    expect(
      (await flow.repository.getDefects()).some(
        (defect) => defect.id === submission.defects[0].id,
      ),
    ).toBe(false)
    expect(await flow.repository.getEquipmentById('EQ-014')).toEqual(
      baselineEquipment,
    )
  })

  it('preserves Supervisor operational changes across logout and login', async () => {
    const flow = createServices()
    const supervisorUser = await flow.auth.login({
      email: 'priya.sharma@fieldsafe.demo',
      password: DEMO_PASSWORD,
    })
    await flow.supervisor.markReviewReviewed('INS-001', supervisorUser.id)

    flow.auth.logout()
    expect(flow.sessions.getUserId()).toBeNull()
    await flow.auth.login({
      email: 'priya.sharma@fieldsafe.demo',
      password: DEMO_PASSWORD,
    })

    expect((await flow.repository.getInspectionById('INS-001'))?.reviewStatus).toBe(
      'Reviewed',
    )
  })
})
