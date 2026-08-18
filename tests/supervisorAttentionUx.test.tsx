// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
} from 'react-router'
import { appRoutes } from '../src/app/router'
import { AuthProvider } from '../src/auth/AuthProvider'
import { authService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'
import { ReviewCard } from '../src/components/supervisor/ReviewCard'
import { supervisorService } from '../src/services/supervisorService'

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

describe('TASK-030 Pass B Supervisor attention UX', () => {
  it('removes redundant Pending Review status while retaining prioritization signals', async () => {
    const review = (await supervisorService.getReviews('Pending Review'))[0]
    render(
      <MemoryRouter>
        <ReviewCard review={review} />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Pending Review')).toBeNull()
    expect(screen.getByText('Fail')).toBeTruthy()
    expect(screen.getByText(review.highestSeverity!)).toBeTruthy()
    expect(screen.getByText(review.equipment.status)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Review' }).getAttribute('href'),
    ).toBe(`/supervisor/reviews/${review.inspection.id}`)
  })

  it('keeps canonical response order and presents each failed defect inline once', async () => {
    const review = (await supervisorService.getReviews('Pending Review'))[0]
    const detail = await supervisorService.getReviewDetail(review.inspection.id)
    const failedEntry = detail.responses.find(
      (entry) => entry.response.result === 'Fail',
    )!
    const action = detail.actions.find(
      (candidate) => candidate.defectId === failedEntry.defect?.id,
    )!

    await renderSupervisorRoute(`/supervisor/reviews/${review.inspection.id}`)

    await screen.findByRole('heading', { name: 'Checklist responses' })
    const responseRows = [...document.querySelectorAll('[data-response-sequence]')]
    expect(
      responseRows.map((row) => Number(row.getAttribute('data-response-sequence'))),
    ).toEqual(detail.responses.map((entry) => entry.item.sequence))
    expect(
      responseRows.filter(
        (row) => row.getAttribute('data-response-result') === 'Pass',
      ).length,
    ).toBeGreaterThan(0)

    const failedRow = document.querySelector(
      `[data-response-sequence="${failedEntry.item.sequence}"]`,
    )!
    expect(failedRow.getAttribute('data-response-result')).toBe('Fail')
    expect(failedRow.className).toContain('border-danger-600')
    expect(
      within(failedRow).getByText(failedEntry.defect!.description),
    ).toBeTruthy()
    expect(
      within(failedRow).getByText(failedEntry.defect!.severity),
    ).toBeTruthy()
    expect(
      within(failedRow).getAllByText(failedEntry.defect!.status).length,
    ).toBeGreaterThan(0)
    expect(
      within(failedRow).getByRole('img', {
        name: `Evidence for ${failedEntry.item.category}`,
      }),
    ).toBeTruthy()
    expect(
      within(failedRow)
        .getAllByText(action.status)
        .some((element) => element.className.includes('text-brand-700')),
    ).toBe(true)
    expect(within(failedRow).getAllByRole('link', { name: 'View action' })).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: 'Defect Assessment' })).toBeNull()
  })

  it('returns Action Detail to its originating inspection review', async () => {
    const review = (await supervisorService.getReviews('Pending Review'))[0]
    const router = await renderSupervisorRoute(
      `/supervisor/reviews/${review.inspection.id}`,
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'View action' }))
    expect(
      await screen.findByRole('heading', { name: 'Corrective Action Detail' }),
    ).toBeTruthy()
    const back = screen.getByRole('link', {
      name: 'Back to inspection review',
    })
    expect(back.getAttribute('href')).toBe(
      `/supervisor/reviews/${review.inspection.id}`,
    )

    await user.click(back)
    expect(router.state.location.pathname).toBe(
      `/supervisor/reviews/${review.inspection.id}`,
    )
  })

  it('returns Action Detail opened from the collection to Corrective Actions', async () => {
    const router = await renderSupervisorRoute('/supervisor/actions')
    const user = userEvent.setup()

    await user.click((await screen.findAllByRole('link', { name: 'View action' }))[0])
    expect(
      await screen.findByRole('heading', { name: 'Corrective Action Detail' }),
    ).toBeTruthy()
    const back = screen.getByRole('link', {
      name: 'Back to corrective actions',
    })

    await user.click(back)
    expect(router.state.location.pathname).toBe('/supervisor/actions')
  })

  it('uses the Corrective Actions collection as the direct-link fallback', async () => {
    const action = (await supervisorService.getActions())[0]
    await renderSupervisorRoute(`/supervisor/actions/${action.action.id}`)

    const back = await screen.findByRole('link', {
      name: 'Back to corrective actions',
    })
    expect(back.getAttribute('href')).toBe('/supervisor/actions')
    expect(
      screen.queryByRole('link', { name: 'Back to inspection review' }),
    ).toBeNull()
  })

  it('preserves review origin for an already Reviewed inspection', async () => {
    const review = (await supervisorService.getReviews('Reviewed')).find(
      (candidate) => candidate.defects.length > 0,
    )!
    const router = await renderSupervisorRoute(
      `/supervisor/reviews/${review.inspection.id}`,
    )
    const user = userEvent.setup()

    expect(await screen.findByText('Reviewed')).toBeTruthy()
    await user.click(screen.getByRole('link', { name: 'View action' }))
    const back = await screen.findByRole('link', {
      name: 'Back to inspection review',
    })
    await user.click(back)

    expect(router.state.location.pathname).toBe(
      `/supervisor/reviews/${review.inspection.id}`,
    )
    expect(await screen.findByText('Reviewed')).toBeTruthy()
  })
})
