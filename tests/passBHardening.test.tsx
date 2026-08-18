// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '../src/app/router'
import { AuthProvider } from '../src/auth/AuthProvider'
import { authService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'
import { SeverityBadge } from '../src/components/common/SeverityBadge'
import { StatusBadge } from '../src/components/common/StatusBadge'
import { ReviewCard } from '../src/components/supervisor/ReviewCard'
import { DEMO_EVIDENCE } from '../src/domain/evidence'
import { fieldSafeRepository } from '../src/repositories'
import { inspectionService } from '../src/services/inspectionService'
import { supervisorService } from '../src/services/supervisorService'

async function renderAuthenticated(path: string, email = 'arjun.nair@fieldsafe.demo') {
  await authService.login({ email, password: DEMO_PASSWORD })
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <AuthProvider service={authService}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

beforeEach(() => {
  window.localStorage.clear()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('TASK-029 Pass B product hardening', () => {
  it('keeps assignment-originated scan fixed to expected equipment and verifies the match', async () => {
    const router = await renderAuthenticated('/inspector/scan?inspection=ASG-001')

    expect(await screen.findByText('Expected assigned equipment')).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Scan' }))

    expect(await screen.findByText('Assigned equipment matched', {}, { timeout: 1_500 })).toBeTruthy()
    expect(router.state.location.pathname).toMatch(/^\/inspector\/equipment\//)
  })

  it('leaving an assignment scan before confirmation does not create Continue state', async () => {
    const router = await renderAuthenticated('/inspector')
    const user = userEvent.setup()

    await user.click((await screen.findAllByRole('button', { name: 'Start Inspection' }))[0])
    await screen.findByRole('heading', { name: 'Scan Equipment' })
    const inspectionId = new URLSearchParams(router.state.location.search).get('inspection')!

    expect((await fieldSafeRepository.getInspectionById(inspectionId))?.status).toBe('Assigned')
  })

  it('standalone scan exposes only actionable assignments for the active Inspector', async () => {
    await renderAuthenticated('/inspector/scan')

    const selection = await screen.findByRole('combobox', {
      name: 'Select equipment to simulate',
    })
    const options = [...selection.querySelectorAll('option')]
    const queue = await inspectionService.getInspectorQueue('USR-INSP-001')

    expect(options).toHaveLength(queue.length)
    expect(queue.every((item) => item.inspection.inspectorId === 'USR-INSP-001')).toBe(true)
    expect(queue.every((item) => item.inspection.status !== 'Completed')).toBe(true)
  })

  it('keeps the checklist CTA in flow above the shell navigation and preserves history spacing', async () => {
    const checklistRouter = await renderAuthenticated('/inspector/inspection/ASG-001')
    expect((await screen.findByTestId('checklist-safe-area')).className).toContain('pb-4')
    const checklistItems = screen.getByTestId('checklist-items')
    const reviewCta = screen.getByTestId('checklist-review-cta')
    expect(reviewCta.className).not.toContain('sticky')
    expect(reviewCta.className).not.toContain('bottom-')
    expect(
      checklistItems.compareDocumentPosition(reviewCta) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    const navigation = screen.getByRole('navigation', {
      name: 'Inspector navigation',
    })
    expect(navigation.className).toContain('shrink-0')
    expect(navigation.className).not.toContain('fixed')
    expect(navigation.previousElementSibling?.tagName).toBe('MAIN')
    expect(navigation.previousElementSibling?.className).toContain('min-h-0')

    cleanup()
    checklistRouter.dispose()
    await renderAuthenticated('/inspector/history')
    expect((await screen.findByTestId('history-safe-area')).className).toContain('pb-6')
  })

  it('keeps failed inspection submission primary and shows canonical consequence', async () => {
    await authService.login({
      email: 'arjun.nair@fieldsafe.demo',
      password: DEMO_PASSWORD,
    })
    const workspace = await inspectionService.getWorkspace('ASG-001', 'USR-INSP-001')
    const [failedItem, ...passingItems] = workspace.items
    await inspectionService.recordResponse('ASG-001', 'USR-INSP-001', failedItem.id, 'Fail')
    await inspectionService.updateDraftDefect('ASG-001', 'USR-INSP-001', failedItem.id, {
      description: 'Hydraulic leak near the front coupling',
      severity: 'Minor',
      evidenceReference: structuredClone(DEMO_EVIDENCE),
    })
    for (const item of passingItems) {
      await inspectionService.recordResponse('ASG-001', 'USR-INSP-001', item.id, 'Pass')
    }
    const expected = await inspectionService.getReviewSummary('ASG-001', 'USR-INSP-001')
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/inspector/inspection/ASG-001/review'],
    })
    render(<AuthProvider service={authService}><RouterProvider router={router} /></AuthProvider>)

    expect(await screen.findByText('Inspection will be submitted as Failed.')).toBeTruthy()
    expect(screen.getByText(expected.resultingEquipmentStatus)).toBeTruthy()
    const submit = screen.getByRole('button', { name: 'Submit Inspection' })
    expect(submit.className).toContain('bg-brand-700')
    expect(submit.className).not.toContain('bg-danger-600')
  })

  it('uses Review for pending inspections and View Review once acknowledged', async () => {
    const review = (await supervisorService.getReviews('All'))[0]
    const { rerender } = render(<MemoryRouter><ReviewCard review={{ ...review, inspection: { ...review.inspection, reviewStatus: 'Pending Review' } }} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Review' })).toBeTruthy()

    rerender(<MemoryRouter><ReviewCard review={{ ...review, inspection: { ...review.inspection, reviewStatus: 'Reviewed' } }} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'View Review' })).toBeTruthy()
  })

  it('uses explicit Manager pass-rate and rolling-period terminology', async () => {
    await renderAuthenticated('/manager', 'varun.mehta@fieldsafe.demo')

    expect(await screen.findByText('Inspection Pass Rate')).toBeTruthy()
    expect(screen.getByText('Inspections — Last 30 Days')).toBeTruthy()
    expect(screen.queryByText('Inspection Compliance')).toBeNull()
    expect(screen.queryByLabelText(/Connectivity:/)).toBeNull()
  })

  it('restores Compliance IA and exposes the pass-rate definition to pointer and keyboard users', async () => {
    await renderAuthenticated('/manager/compliance', 'varun.mehta@fieldsafe.demo')

    expect(await screen.findByRole('heading', { name: 'Compliance' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Compliance' })).toBeTruthy()
    expect(await screen.findByText('Inspection Pass Rate')).toBeTruthy()
    const help = await screen.findByRole('button', {
      name: 'Inspection Pass Rate definition',
    })
    const tooltip = document.getElementById(help.getAttribute('aria-describedby')!)!

    expect(tooltip.textContent).toBe('Passed inspections ÷ completed inspections')
    expect(help.getAttribute('aria-describedby')).toBe(tooltip.id)
    expect(tooltip.className).toContain('group-hover:opacity-100')
    expect(tooltip.className).toContain('group-focus-within:opacity-100')
    help.focus()
    expect(document.activeElement).toBe(help)
    for (const label of [
      'Inspection Pass Rate',
      'Completed Inspections',
      'Passed',
      'Failed',
    ]) {
      const metricLabel = screen
        .getAllByText(label)
        .find((element) => element.parentElement?.className.includes('min-h-12'))
      expect(metricLabel?.parentElement?.className).toContain('min-h-12')
    }
    expect(screen.queryByText('Across the available historical period')).toBeNull()
    expect(screen.queryByText('Inspections completed without a failed response')).toBeNull()
    expect(screen.queryByText('Inspections containing one or more failures')).toBeNull()
    expect(screen.getByText('Monthly performance across the selected reporting period.')).toBeTruthy()
  })

  it('shows a clean pass in recent passed records and opens read-only detail', async () => {
    await authService.login({
      email: 'arjun.nair@fieldsafe.demo',
      password: DEMO_PASSWORD,
    })
    const pendingBefore = (await supervisorService.getDashboard()).pendingReviews.length
    const workspace = await inspectionService.getWorkspace(
      'ASG-001',
      'USR-INSP-001',
    )
    for (const item of workspace.items) {
      await inspectionService.recordResponse(
        workspace.inspection.id,
        'USR-INSP-001',
        item.id,
        'Pass',
      )
    }
    await inspectionService.saveSignature(
      workspace.inspection.id,
      'USR-INSP-001',
      { strokes: [[{ x: 0.1, y: 0.4 }, { x: 0.8, y: 0.6 }]] },
    )
    const submission = await inspectionService.submitInspection(
      workspace.inspection.id,
      'USR-INSP-001',
    )
    const dashboard = await supervisorService.getDashboard()
    expect(submission.inspection.reviewStatus).toBeNull()
    expect(dashboard.pendingReviews).toHaveLength(pendingBefore)
    expect(
      dashboard.pendingReviews.some(
        (item) => item.inspection.id === submission.inspection.id,
      ),
    ).toBe(false)
    cleanup()

    await renderAuthenticated('/supervisor', 'priya.sharma@fieldsafe.demo')
    expect(
      await screen.findByRole('heading', {
        name: 'Recent Passed Inspections',
      }),
    ).toBeTruthy()
    const view = screen.getByRole('link', {
      name: `View completed inspection ${submission.inspection.id}`,
    })
    const card = view.closest('.rounded-card')!
    expect(within(card).getByText('Completed')).toBeTruthy()
    expect(within(card).getByText('Pass')).toBeTruthy()
    expect(within(card).queryByText('Pending Review')).toBeNull()
    expect(submission.defects).toHaveLength(0)
    expect(submission.equipment.status).toBe('Fit')

    const user = userEvent.setup()
    await user.click(view)
    expect(
      await screen.findByRole('heading', { name: 'Completed Inspection' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Back to Supervisor Overview' }),
    ).toBeTruthy()
    expect(screen.queryByText('Pending Review')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Mark Review as Reviewed' }),
    ).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Create Corrective Action' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Defect Assessment' })).toBeNull()
    expect(screen.getAllByText('Pass').length).toBeGreaterThan(0)
    expect(screen.getByText('Fit')).toBeTruthy()
  })

  it('makes Supervisor risk KPIs explicit and explains corrective-action states', async () => {
    await renderAuthenticated('/supervisor', 'priya.sharma@fieldsafe.demo')

    expect(await screen.findByText('Critical Defects')).toBeTruthy()
    expect(screen.getByText('Out-of-Service Equipment')).toBeTruthy()
    expect(screen.queryByText('Critical / OOS')).toBeNull()
    expect(screen.queryByLabelText(/Connectivity:/)).toBeNull()
    const definitions = {
      'Pending Reviews': 'Submitted failed inspections awaiting Supervisor acknowledgement.',
      'Open Actions': 'Corrective actions currently Open or In Progress.',
      'Overdue Actions': 'Unfinished corrective actions past their due date.',
      'Critical Defects': 'Unresolved defects with Critical severity.',
      'Out-of-Service Equipment': 'Equipment currently Out of Service due to unresolved safety risk.',
    }
    for (const [label, definition] of Object.entries(definitions)) {
      const help = screen.getByRole('button', { name: `${label} definition` })
      const tooltip = document.getElementById(help.getAttribute('aria-describedby')!)
      expect(tooltip?.textContent).toBe(definition)
      expect(tooltip?.className).toContain('group-hover:opacity-100')
      expect(tooltip?.className).toContain('group-focus-within:opacity-100')
      help.focus()
      expect(document.activeElement).toBe(help)
      expect(help.parentElement?.parentElement?.className).toContain('min-h-12')
    }
    expect(screen.queryByText('Submitted inspections awaiting acknowledgement')).toBeNull()
    expect(screen.queryByText('Open and in-progress corrective work')).toBeNull()
    expect(screen.queryByText('Unfinished actions past their due date')).toBeNull()
    const quietIcons = document.querySelectorAll('[data-icon-variant="quiet"]')
    expect(quietIcons).toHaveLength(5)
    expect(
      [...quietIcons].every(
        (icon) =>
          icon.className.includes('bg-slate-50') &&
          icon.className.includes('border-slate-200'),
      ),
    ).toBe(true)

    cleanup()
    const action = (await fieldSafeRepository.getCorrectiveActions()).find(
      (item) => item.status === 'Open',
    )!
    await renderAuthenticated(`/supervisor/actions/${action.id}`, 'priya.sharma@fieldsafe.demo')
    expect(await screen.findByText('Corrective work has not started.')).toBeTruthy()
  })

  it('keeps safety and severity shared presentation semantically consistent', () => {
    render(
      <div>
        <StatusBadge status="Fit" />
        <StatusBadge status="Restricted" />
        <StatusBadge status="Out of Service" />
        <SeverityBadge severity="Minor" />
        <SeverityBadge severity="Major" />
        <SeverityBadge severity="Critical" />
      </div>,
    )

    expect(screen.getByText('Fit').className).toContain('text-success-700')
    expect(screen.getByText('Restricted').className).toContain('text-warning-800')
    expect(screen.getByText('Out of Service').className).toContain('text-danger-700')
    expect(screen.getByText('Minor').className).toContain('text-brand-700')
    expect(screen.getByText('Major').className).toContain('text-warning-800')
    expect(screen.getByText('Critical').className).toContain('text-danger-700')
  })

  it('links between Login and the public Gate without connectivity claims', async () => {
    const loginRouter = createMemoryRouter(appRoutes, { initialEntries: ['/login'] })
    render(<AuthProvider service={authService}><RouterProvider router={loginRouter} /></AuthProvider>)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('link', { name: 'Open Gate Check' }))

    expect(await screen.findByRole('link', { name: 'Return to Login' })).toBeTruthy()
    expect(screen.queryByLabelText(/Connectivity:/)).toBeNull()
    await waitFor(() => expect(loginRouter.state.location.pathname).toBe('/gate'))
  })
})
