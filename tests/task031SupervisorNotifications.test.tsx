// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '../src/app/router'
import { AuthProvider } from '../src/auth/AuthProvider'
import { authService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'
import { DEMO_EVIDENCE } from '../src/domain/evidence'
import { fieldSafeRepository } from '../src/repositories'
import { InspectionService } from '../src/services/inspectionService'
import {
  SupervisorNotificationService,
  supervisorNotificationService,
} from '../src/services/supervisorNotificationService'

async function renderSupervisor(path = '/supervisor') {
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

async function submitFailedInspection() {
  const service = new InspectionService(fieldSafeRepository)
  const workspace = await service.getWorkspace('ASG-001', 'USR-INSP-001')
  const [failedItem, ...passingItems] = workspace.items
  await service.recordResponse(
    workspace.inspection.id,
    'USR-INSP-001',
    failedItem.id,
    'Fail',
  )
  await service.updateDraftDefect(
    workspace.inspection.id,
    'USR-INSP-001',
    failedItem.id,
    {
      description: 'Critical brake hose damage requires Supervisor review',
      severity: 'Critical',
      evidenceReference: structuredClone(DEMO_EVIDENCE),
    },
  )
  for (const item of passingItems) {
    await service.recordResponse(
      workspace.inspection.id,
      'USR-INSP-001',
      item.id,
      'Pass',
    )
  }
  await service.saveSignature(workspace.inspection.id, 'USR-INSP-001', {
    strokes: [[{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.7 }]],
  })
  return service.submitInspection(workspace.inspection.id, 'USR-INSP-001')
}

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('TASK-031 Supervisor actionable notifications', () => {
  it('renders a bounded newest-first Supervisor notification center', async () => {
    const notifications = await supervisorNotificationService.getNotifications(
      'USR-SUP-001',
    )
    await renderSupervisor()
    const user = userEvent.setup()
    const bell = await screen.findByRole('button', {
      name: `Notifications, ${notifications.length} unread`,
    })
    await user.click(bell)

    const panel = screen.getByRole('region', { name: 'Supervisor notifications' })
    const list = screen.getByTestId('notification-scroll-list')
    expect(panel.className).toContain('max-h-')
    expect(list.className).toContain('overflow-y-auto')
    const rows = within(list).getAllByRole('button', {
      name: /Open Inspection requires review/,
    })
    expect(rows).toHaveLength(notifications.length)
    expect(rows[0].textContent).toContain(notifications[0].message)
  })

  it('marks read only on activation and deep-links to the correct review', async () => {
    const router = await renderSupervisor()
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: /Notifications, 2 unread/ }),
    )
    const row = screen.getAllByRole('button', {
      name: /Open Inspection requires review/,
    })[0]
    const inspectionId = (
      await supervisorNotificationService.getNotifications('USR-SUP-001')
    )[0].inspectionId!

    await user.hover(row)
    row.focus()
    expect(
      (await fieldSafeRepository.getNotifications('USR-SUP-001')).find(
        (notification) => notification.inspectionId === inspectionId,
      )?.readAt,
    ).toBeNull()

    fireEvent.keyDown(row, { key: ' ' })
    await screen.findByRole('heading', { name: 'Inspection Review' })
    expect(router.state.location.pathname).toBe(
      `/supervisor/reviews/${inspectionId}`,
    )
    expect(
      (await fieldSafeRepository.getNotifications('USR-SUP-001')).find(
        (notification) => notification.inspectionId === inspectionId,
      )?.readAt,
    ).not.toBeNull()
    expect(screen.queryByRole('region', { name: 'Supervisor notifications' })).toBeNull()
  })

  it('supports Mark All Read with persisted state', async () => {
    await renderSupervisor()
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: /Notifications, 2 unread/ }),
    )
    await user.click(screen.getByRole('button', { name: 'Mark all read' }))
    expect(
      (await fieldSafeRepository.getNotifications('USR-SUP-001')).every(
        (notification) => notification.readAt !== null,
      ),
    ).toBe(true)
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy()
  })

  it('atomically creates one deduplicated notification for a new failed submission', async () => {
    const submission = await submitFailedInspection()
    const expectedId = `NTF-REVIEW-${submission.inspection.id}-USR-SUP-001`
    const first = await supervisorNotificationService.getNotifications('USR-SUP-001')
    const reconstructed = new SupervisorNotificationService(fieldSafeRepository)
    const second = await reconstructed.getNotifications('USR-SUP-001')

    expect(first.filter((notification) => notification.id === expectedId)).toHaveLength(1)
    expect(second.filter((notification) => notification.id === expectedId)).toHaveLength(1)
    expect(first.find((notification) => notification.id === expectedId)).toMatchObject({
      type: 'FAILED_INSPECTION_REVIEW',
      targetRoute: `/supervisor/reviews/${submission.inspection.id}`,
    })
  })
})
