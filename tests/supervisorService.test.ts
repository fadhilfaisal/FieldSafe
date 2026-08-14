import { describe, expect, it } from 'vitest'
import { AuthService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'
import {
  BrowserSessionStore,
  type PersistedSession,
} from '../src/auth/sessionStore'
import { DEMO_EVIDENCE } from '../src/domain/evidence'
import type { SignatureData } from '../src/domain/models'
import { isCorrectiveActionOverdue } from '../src/domain/safety'
import {
  BrowserFieldSafeRepository,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import { InspectionService } from '../src/services/inspectionService'
import { SupervisorService } from '../src/services/supervisorService'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

const OPERATIONAL_KEY = 'fieldsafe:test:supervisor-operational'
const SESSION_KEY = 'fieldsafe:test:supervisor-session'
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
      OPERATIONAL_KEY,
      () => storage,
    ),
  )
  const sessions = new BrowserSessionStore(
    new BrowserStorageAdapter<PersistedSession>(SESSION_KEY, () => storage),
  )
  return {
    auth: new AuthService(repository, sessions),
    inspector: new InspectionService(repository, () => NOW),
    repository,
    sessions,
    storage,
    supervisor: new SupervisorService(repository, () => NOW),
  }
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

    expect(reviews).toHaveLength(8)
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
  })

  it('marks a review as reviewed and reconstructs the persisted lifecycle', async () => {
    const flow = createServices()
    await flow.supervisor.markReviewReviewed('INS-001', 'USR-SUP-001')

    const reconstructed = createServices(flow.storage)
    const inspection = await reconstructed.repository.getInspectionById('INS-001')

    expect(inspection?.reviewStatus).toBe('Reviewed')
    expect(inspection?.reviewedAt).toBe(NOW)
    expect(inspection?.reviewedByUserId).toBe('USR-SUP-001')
    expect(
      (await reconstructed.supervisor.getReviews('Pending Review')).some(
        (review) => review.inspection.id === 'INS-001',
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

    expect(actions.filter((item) => item.overdue)).toHaveLength(3)
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
