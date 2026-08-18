// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
import { AnalyticsColumnChart } from '../src/components/manager/AnalyticsColumnChart'
import { createRoundedIntegerTicks } from '../src/components/manager/chartMath'
import { CompletedInspectionCard } from '../src/components/supervisor/CompletedInspectionCard'
import { CorrectiveActionCard } from '../src/components/supervisor/CorrectiveActionCard'
import { ReviewCard } from '../src/components/supervisor/ReviewCard'
import { managerService } from '../src/services/managerService'
import { supervisorService } from '../src/services/supervisorService'

async function renderAuthenticated(path: string, email: string) {
  await authService.login({ email, password: DEMO_PASSWORD })
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

describe('TASK-032 chart headroom', () => {
  it('keeps a rounded integer axis above changing maximum values', () => {
    for (const maximum of [9, 10, 11, 27]) {
      const ticks = createRoundedIntegerTicks(maximum, 6, true)
      expect(ticks[0]).toBe(0)
      expect(ticks.at(-1)).toBeGreaterThan(maximum)
      expect(ticks.every(Number.isInteger)).toBe(true)
    }
    expect(createRoundedIntegerTicks(21)).toEqual([0, 5, 10, 15, 20, 25])
  })

  it('renders every value label with reserved headroom and retains zero columns', () => {
    render(
      <AnalyticsColumnChart
        ariaLabel="Defect volume headroom fixture"
        tone="danger"
        reserveValueLabelHeadroom
        data={[
          { key: 'zero', label: 'Zero', value: 0 },
          { key: 'tick', label: 'Tick', value: 10 },
          { key: 'maximum', label: 'Maximum', value: 27 },
        ]}
      />,
    )

    const chart = screen.getByRole('img', {
      name: 'Defect volume headroom fixture',
    })
    expect(chart.getAttribute('data-value-label-headroom')).toBe('reserved')
    expect(chart.querySelectorAll('[data-column-value-label]')).toHaveLength(3)
    expect(
      Number(
        [...chart.querySelectorAll('[data-axis-tick]')][0].getAttribute(
          'data-axis-tick',
        ),
      ),
    ).toBeGreaterThan(27)
    expect(
      chart.querySelector('[data-chart-key="zero"]')?.getAttribute(
        'data-chart-value',
      ),
    ).toBe('0')
  })
})

describe('TASK-032 audited full-surface navigation', () => {
  it('opens an Inspector assignment from the full card with native keyboard navigation', async () => {
    const router = await renderAuthenticated(
      '/inspector',
      'arjun.nair@fieldsafe.demo',
    )
    const user = userEvent.setup()
    const surface = (await screen.findAllByRole('link', {
      name: /inspection for/i,
    }))[0]

    expect(surface.tagName).toBe('A')
    expect(surface.className).toContain('focus-visible:outline')
    expect(
      (await screen.findAllByRole('button', {
        name: /Start Inspection|Continue/,
      })).length,
    ).toBeGreaterThan(0)

    surface.focus()
    await user.keyboard('{Enter}')
    expect(router.state.location.pathname).toMatch(
      /^\/inspector\/(scan|inspection\/)/,
    )
  })

  it('keeps Supervisor CTAs while exposing equivalent full-card links', async () => {
    const dashboard = await supervisorService.getDashboard()
    const pending = dashboard.pendingReviews[0]
    const action = dashboard.actions.find(
      (candidate) => candidate.action.status !== 'Done',
    )!
    const passed = dashboard.recentPassedInspections[0]

    const { rerender } = render(
      <MemoryRouter>
        <ReviewCard review={pending} />
      </MemoryRouter>,
    )
    const reviewSurface = screen.getByRole('link', {
      name: `Review for ${pending.equipment.assetCode}`,
    })
    const reviewCta = screen.getByRole('link', { name: 'Review' })
    expect(reviewSurface.getAttribute('href')).toBe(reviewCta.getAttribute('href'))
    expect(reviewSurface.contains(reviewCta)).toBe(false)

    rerender(
      <MemoryRouter>
        <CorrectiveActionCard item={action} />
      </MemoryRouter>,
    )
    const actionSurface = screen.getByRole('link', {
      name: `View corrective action ${action.action.title}`,
    })
    const actionCta = screen.getByRole('link', { name: 'View action' })
    expect(actionSurface.getAttribute('href')).toBe(actionCta.getAttribute('href'))
    expect(actionSurface.contains(actionCta)).toBe(false)

    rerender(
      <MemoryRouter>
        <CompletedInspectionCard item={passed} />
      </MemoryRouter>,
    )
    const completedSurface = screen.getByRole('link', {
      name: `Open completed inspection ${passed.inspection.id}`,
    })
    const completedCta = screen.getByRole('link', {
      name: `View completed inspection ${passed.inspection.id}`,
    })
    expect(completedSurface.getAttribute('href')).toBe(
      completedCta.getAttribute('href'),
    )
    expect(document.querySelector('a a')).toBeNull()
  })

  it('uses full-card links for pending, reviewed, and corrective-action collections', async () => {
    await renderAuthenticated(
      '/supervisor/reviews',
      'priya.sharma@fieldsafe.demo',
    )
    expect(
      (await screen.findAllByRole('link', { name: /^Review for / })).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Review' }).length).toBeGreaterThan(0)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reviewed' }))
    expect(
      (await screen.findAllByRole('link', { name: /^View review for / })).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('link', { name: 'View Review' }).length,
    ).toBeGreaterThan(0)

    cleanup()
    await renderAuthenticated(
      '/supervisor/actions',
      'priya.sharma@fieldsafe.demo',
    )
    expect(
      (await screen.findAllByRole('link', {
        name: /^View corrective action /,
      })).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('link', { name: 'View action' }).length,
    ).toBeGreaterThan(0)
    expect(document.querySelector('a a')).toBeNull()
  })
})

describe('TASK-032 Manager navigation filters', () => {
  it('opens Manager Equipment with the selected Overview safety-state filter', async () => {
    const router = await renderAuthenticated(
      '/manager',
      'varun.mehta@fieldsafe.demo',
    )
    const user = userEvent.setup()
    const statusLink = await screen.findByRole('link', {
      name: 'View Out of Service equipment',
    })

    await user.click(statusLink)
    expect(router.state.location.pathname).toBe('/manager/equipment')
    expect(new URLSearchParams(router.state.location.search).get('state')).toBe(
      'Out of Service',
    )
    expect(
      screen.getByRole('button', { name: 'Out of Service' }).getAttribute(
        'aria-pressed',
      ),
    ).toBe('true')
  })

  it('deep-links every severity and filters by unresolved defects without changing status', async () => {
    const before = await managerService.getEquipmentBoard()
    const router = await renderAuthenticated(
      '/manager/defects',
      'varun.mehta@fieldsafe.demo',
    )

    for (const severity of ['Minor', 'Major', 'Critical'] as const) {
      const link = await screen.findByRole('link', {
        name: `View equipment with unresolved ${severity} defects`,
      })
      expect(
        new URL((link as HTMLAnchorElement).href).searchParams.get('severity'),
      ).toBe(severity)
    }

    const user = userEvent.setup()
    await user.click(
      screen.getByRole('link', {
        name: 'View equipment with unresolved Critical defects',
      }),
    )
    expect(router.state.location.pathname).toBe('/manager/equipment')
    expect(
      (screen.getByLabelText('Defect severity') as HTMLSelectElement).value,
    ).toBe('Critical')

    const displayedIds = (await screen.findAllByRole('link', {
      name: /^View /,
    }))
      .map((link) => link.getAttribute('data-equipment-row-link'))
      .filter(Boolean)
    const criticalItems = before.filter((item) =>
      item.unresolvedDefects.some((defect) => defect.severity === 'Critical'),
    )
    expect(displayedIds).toEqual(
      criticalItems.map((item) => item.equipment.id),
    )

    const after = await managerService.getEquipmentBoard()
    expect(
      after.map((item) => [item.equipment.id, item.status]),
    ).toEqual(before.map((item) => [item.equipment.id, item.status]))
  })

  it('composes severity, safety-state, and equipment-type filters', async () => {
    const board = await managerService.getEquipmentBoard()
    const candidate = board.find(
      (item) =>
        item.unresolvedDefects.length > 0 && item.highestUnresolvedSeverity,
    )!
    const severity = candidate.unresolvedDefects[0].severity
    const router = await renderAuthenticated(
      `/manager/equipment?state=${encodeURIComponent(candidate.status)}&severity=${severity}`,
      'varun.mehta@fieldsafe.demo',
    )
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: 'Fleet Status Board' })
    await user.selectOptions(
      screen.getByLabelText('Equipment type'),
      candidate.equipment.type,
    )
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('state')).toBe(candidate.status)
    expect(params.get('severity')).toBe(severity)
    expect(params.get('type')).toBe(candidate.equipment.type)

    const boardRegion = screen.getByRole('list', {
      name: 'Fleet equipment status',
    })
    for (const link of within(boardRegion).getAllByRole('link')) {
      const item = board.find(
        (entry) =>
          entry.equipment.id === link.getAttribute('data-equipment-row-link'),
      )!
      expect(item.status).toBe(candidate.status)
      expect(item.equipment.type).toBe(candidate.equipment.type)
      expect(
        item.unresolvedDefects.some((defect) => defect.severity === severity),
      ).toBe(true)
    }
  })

  it('keeps donut segments pointer and keyboard navigable', async () => {
    const router = await renderAuthenticated(
      '/manager/defects',
      'varun.mehta@fieldsafe.demo',
    )
    const critical = await screen.findByRole('link', {
      name: /Critical.*View matching equipment/,
    })
    expect(critical.getAttribute('tabindex')).toBe('0')
    expect(critical.getAttribute('data-severity-destination')).toContain(
      'severity=Critical',
    )

    critical.focus()
    fireEvent.keyDown(critical, { key: ' ' })
    expect(router.state.location.pathname).toBe('/manager/equipment')
    expect(new URLSearchParams(router.state.location.search).get('severity')).toBe(
      'Critical',
    )
  })
})
