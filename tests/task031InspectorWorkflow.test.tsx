// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '../src/app/router'
import { AuthProvider } from '../src/auth/AuthProvider'
import { authService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'
import { DEMO_EVIDENCE } from '../src/domain/evidence'
import { inspectionService } from '../src/services/inspectionService'

async function renderInspector(path: string) {
  await authService.login({
    email: 'arjun.nair@fieldsafe.demo',
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

async function prepareFailedDraft() {
  const workspace = await inspectionService.getWorkspace(
    'ASG-001',
    'USR-INSP-001',
  )
  const [failedItem, ...passingItems] = workspace.items
  await inspectionService.recordResponse(
    workspace.inspection.id,
    'USR-INSP-001',
    failedItem.id,
    'Fail',
  )
  await inspectionService.updateDraftDefect(
    workspace.inspection.id,
    'USR-INSP-001',
    failedItem.id,
    {
      description: 'Hydraulic line is leaking beside the front coupling',
      severity: 'Critical',
      evidenceReference: structuredClone(DEMO_EVIDENCE),
    },
  )
  for (const item of passingItems) {
    await inspectionService.recordResponse(
      workspace.inspection.id,
      'USR-INSP-001',
      item.id,
      'Pass',
    )
  }
  return { workspace, failedItem }
}

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('TASK-031 Inspector workflow completion', () => {
  it('opens a completed History entry as a read-only inspection detail', async () => {
    const history = await inspectionService.getInspectorHistory('USR-INSP-001')
    const expected = history[0]
    const router = await renderInspector('/inspector/history')
    const user = userEvent.setup()
    const matchingLinks = await screen.findAllByRole('link', {
      name: `View completed inspection ${expected.equipment.assetCode}`,
    })
    const link = matchingLinks.find(
      (candidate) =>
        candidate.getAttribute('data-history-inspection') ===
        expected.inspection.id,
    )!

    expect(link.getAttribute('data-history-inspection')).toBe(
      expected.inspection.id,
    )
    link.focus()
    expect(document.activeElement).toBe(link)
    await user.click(link)

    const detail = await screen.findByTestId('completed-inspection-detail')
    expect(router.state.location.pathname).toBe(
      `/inspector/history/${expected.inspection.id}`,
    )
    expect(
      within(detail).getAllByText(new RegExp(expected.equipment.assetCode))
        .length,
    ).toBeGreaterThan(0)
    expect(
      within(detail).getByText(new RegExp(expected.equipment.name)),
    ).toBeTruthy()
    expect(
      within(detail).getAllByText(expected.inspection.result!).length,
    ).toBeGreaterThan(0)
    expect(within(detail).getByText(/Synced|Pending Sync/)).toBeTruthy()
    expect(within(detail).queryByRole('form')).toBeNull()
    expect(within(detail).queryByRole('button')).toBeNull()
    expect(within(detail).queryByText('Submit Inspection')).toBeNull()

    await user.click(within(detail).getByRole('link', { name: 'Back to History' }))
    expect(router.state.location.pathname).toBe('/inspector/history')
  })

  it('renders submitted responses in canonical order with historical defect evidence', async () => {
    const history = await inspectionService.getInspectorHistory('USR-INSP-001')
    const failedHistory = history.find((item) => item.inspection.result === 'Fail')!
    const workspace = await inspectionService.getCompletedInspectionDetail(
      failedHistory.inspection.id,
      'USR-INSP-001',
    )
    await renderInspector(`/inspector/history/${failedHistory.inspection.id}`)

    const detail = await screen.findByTestId('completed-inspection-detail')
    const rows = Array.from(detail.querySelectorAll('[data-response-sequence]'))
    expect(rows.map((row) => Number(row.getAttribute('data-response-sequence')))).toEqual(
      workspace.items.map((item) => item.sequence),
    )
    const failedRow = detail.querySelector('[data-response-result="Fail"]')!
    const defect = workspace.defects[0]
    expect(within(failedRow).getByText(defect.description)).toBeTruthy()
    expect(within(failedRow).getByText(defect.severity)).toBeTruthy()
    expect(
      within(failedRow).getByRole('img', {
        name: /Evidence for .* defect/,
      }),
    ).toBeTruthy()
  })

  it('shows draft defect context inline once while preserving checklist order and submission controls', async () => {
    const { workspace, failedItem } = await prepareFailedDraft()
    await renderInspector(`/inspector/inspection/${workspace.inspection.id}/review`)

    await screen.findByRole('heading', { name: 'Review & Sign' })
    const responses = document.querySelectorAll('[data-response-sequence]')
    expect(Array.from(responses).map((row) => Number(row.getAttribute('data-response-sequence')))).toEqual(
      workspace.items.map((item) => item.sequence),
    )
    const failedRow = document.querySelector(
      `[data-inline-defect="${failedItem.id}"]`,
    )!
    expect(
      within(failedRow).getByText(
        'Hydraulic line is leaking beside the front coupling',
      ),
    ).toBeTruthy()
    expect(within(failedRow).getByText('Critical')).toBeTruthy()
    expect(within(failedRow).getByRole('img', { name: /Evidence for/ })).toBeTruthy()
    expect(
      screen.getAllByText('Hydraulic line is leaking beside the front coupling'),
    ).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: 'Defect summary' })).toBeNull()
    expect(document.querySelectorAll('[data-response-result="Pass"]')).toHaveLength(
      workspace.items.length - 1,
    )
    expect(screen.getByRole('button', { name: 'Submit Inspection' })).toBeTruthy()
    expect(screen.getByLabelText('Inspector signature pad')).toBeTruthy()
  })
})
