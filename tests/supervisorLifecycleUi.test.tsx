// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '../src/app/router'
import { AuthProvider } from '../src/auth/AuthProvider'
import { authService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'
import { DEMO_EVIDENCE } from '../src/domain/evidence'
import type { SignatureData } from '../src/domain/models'
import { fieldSafeRepository } from '../src/repositories'
import { InspectionService } from '../src/services/inspectionService'
import { SupervisorService } from '../src/services/supervisorService'

const NOW = '2026-08-14T12:00:00.000Z'
const signature: SignatureData = {
  strokes: [[{ x: 0.1, y: 0.5 }, { x: 0.8, y: 0.4 }]],
}

async function submitCriticalInspection() {
  const inspection = new InspectionService(fieldSafeRepository, () => NOW)
  const workspace = await inspection.getWorkspace(
    'ASG-001',
    'USR-INSP-001',
  )
  const [failedItem, ...passingItems] = workspace.items
  await inspection.recordResponse(
    'ASG-001',
    'USR-INSP-001',
    failedItem.id,
    'Fail',
  )
  await inspection.updateDraftDefect(
    'ASG-001',
    'USR-INSP-001',
    failedItem.id,
    {
      description: 'Critical defect for Supervisor lifecycle UI',
      severity: 'Critical',
      evidenceReference: structuredClone(DEMO_EVIDENCE),
    },
  )
  for (const item of passingItems) {
    await inspection.recordResponse(
      'ASG-001',
      'USR-INSP-001',
      item.id,
      'Pass',
    )
  }
  await inspection.saveSignature('ASG-001', 'USR-INSP-001', signature)
  return inspection.submitInspection('ASG-001', 'USR-INSP-001')
}

async function renderSupervisorRoute(path: string) {
  await authService.login({
    email: 'priya.sharma@fieldsafe.demo',
    password: DEMO_PASSWORD,
  })
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <AuthProvider service={authService}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('Supervisor lifecycle UI', () => {
  it('warns before Review and keeps unassigned remediation available afterward', async () => {
    const submission = await submitCriticalInspection()
    await renderSupervisorRoute(
      `/supervisor/reviews/${submission.inspection.id}`,
    )
    const user = userEvent.setup()

    await user.click(
      await screen.findByRole('button', {
        name: 'Mark Review as Reviewed',
      }),
    )
    const dialog = screen.getByRole('dialog', {
      name: 'Mark inspection as reviewed?',
    })
    expect(
      within(dialog).getByText(
        '1 unresolved defect has no corrective action assigned. Mark this inspection as reviewed anyway?',
      ),
    ).toBeTruthy()
    expect(
      (await fieldSafeRepository.getInspectionById('ASG-001'))?.reviewStatus,
    ).toBe('Pending Review')

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Mark Reviewed Anyway',
      }),
    )

    await screen.findByText('Inspection review marked as reviewed.')
    expect(
      (await fieldSafeRepository.getInspectionById('ASG-001'))?.reviewStatus,
    ).toBe('Reviewed')
    expect(
      screen.getAllByRole('heading', { name: 'Create Corrective Action' }),
    ).toHaveLength(1)
    expect(
      screen.queryByRole('heading', { name: 'Defect Assessment' }),
    ).toBeNull()
  })

  it('requires confirmation before verifying completed remediation', async () => {
    const submission = await submitCriticalInspection()
    const supervisor = new SupervisorService(fieldSafeRepository, () => NOW)
    const action = await supervisor.createCorrectiveAction({
      defectId: submission.defects[0].id,
      description: 'Complete corrective work for Supervisor verification.',
      assignedToUserId: 'USR-TECH-001',
      dueDate: '2026-08-21',
      supervisorId: 'USR-SUP-001',
    })
    await supervisor.updateCorrectiveActionStatus(action.id, 'Done')
    await renderSupervisorRoute(`/supervisor/actions/${action.id}`)
    const user = userEvent.setup()

    await user.click(
      await screen.findByRole('button', {
        name: 'Verify & Resolve Defect',
      }),
    )
    const dialog = screen.getByRole('dialog', {
      name: 'Verify remediation and resolve defect?',
    })
    expect(
      within(dialog).getByText(
        /Resolving this defect will recalculate the equipment's safety state/,
      ),
    ).toBeTruthy()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(
      (await fieldSafeRepository.getDefects('ASG-001'))[0].status,
    ).toBe('Open')
    expect(
      (await fieldSafeRepository.getEquipmentById(submission.equipment.id))
        ?.status,
    ).toBe('Out of Service')

    await user.click(
      screen.getByRole('button', { name: 'Verify & Resolve Defect' }),
    )
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Verify & Resolve',
      }),
    )

    await screen.findByText(
      'Defect verified and resolved. Equipment is now Fit.',
    )
    await waitFor(async () =>
      expect(
        (await fieldSafeRepository.getDefects('ASG-001'))[0],
      ).toMatchObject({
        status: 'Resolved',
        resolvedByUserId: 'USR-SUP-001',
      }),
    )
  })
})
