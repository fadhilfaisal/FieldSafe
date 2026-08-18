// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '../src/app/router'
import { AuthProvider } from '../src/auth/AuthProvider'
import { authService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'
import { ToastProvider } from '../src/components/feedback/ToastProvider'
import { useToast } from '../src/components/feedback/useToast'
import { createFieldSafeSeedData } from '../src/data/seed/fieldSafeSeed'
import type { SignatureData } from '../src/domain/models'
import {
  BrowserFieldSafeRepository,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import { fieldSafeRepository } from '../src/repositories'
import { InspectionService } from '../src/services/inspectionService'
import { InspectorNotificationService } from '../src/services/inspectorNotificationService'
import { SimulatedConnectivityService } from '../src/connectivity/connectivityService'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

const STORAGE_KEY = 'fieldsafe:test:notifications'
const NOW = '2026-08-18T10:00:00.000Z'
const signature: SignatureData = {
  strokes: [[{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.7 }]],
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
  const notifications = new InspectorNotificationService(repository, () => NOW)
  return {
    repository,
    notifications,
    inspection: new InspectionService(repository, () => NOW),
    connectivity: new SimulatedConnectivityService(
      repository,
      async () => undefined,
      0,
      notifications,
    ),
    storage,
  }
}

async function completeAllPass(flow: ReturnType<typeof createFlow>) {
  const workspace = await flow.inspection.getWorkspace(
    'ASG-001',
    'USR-INSP-001',
  )
  for (const item of workspace.items) {
    await flow.inspection.recordResponse(
      'ASG-001',
      'USR-INSP-001',
      item.id,
      'Pass',
    )
  }
  await flow.inspection.saveSignature('ASG-001', 'USR-INSP-001', signature)
}

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

function ToastHarness() {
  const { showToast } = useToast()
  return (
    <button
      type="button"
      onClick={() => showToast({ message: 'Inspection submitted successfully.', tone: 'success' })}
    >
      Submit feedback
    </button>
  )
}

beforeEach(() => {
  window.localStorage.clear()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Inspector persistent notifications', () => {
  it('seeds deterministic assignment notifications scoped to each Inspector', async () => {
    const flow = createFlow()
    const arjun = await flow.notifications.getNotifications('USR-INSP-001')
    const neha = await flow.notifications.getNotifications('USR-INSP-002')

    expect(arjun).toHaveLength(2)
    expect(neha).toHaveLength(2)
    expect(arjun.every((notification) => notification.userId === 'USR-INSP-001')).toBe(true)
    expect(neha.every((notification) => notification.userId === 'USR-INSP-002')).toBe(true)
    expect(arjun.every((notification) => notification.type === 'NEW_ASSIGNMENT')).toBe(true)
  })

  it('uses the full assignment row for activation, read persistence, and navigation', async () => {
    let router = await renderAuthenticated('/inspector')
    const user = userEvent.setup()
    const bell = await screen.findByRole('button', {
      name: 'Notifications, 2 unread',
    })

    await user.click(bell)
    const panel = screen.getByRole('region', { name: 'Inspector notifications' })
    expect(within(panel).getAllByText('New inspection assigned')).toHaveLength(2)
    expect(within(panel).queryByRole('button', { name: 'View inspection' })).toBeNull()
    expect(within(panel).queryByRole('button', { name: /Mark .* as read/ })).toBeNull()
    const assignmentRow = within(panel).getByRole('button', {
      name: /Open New inspection assigned: MWP-003/,
    })
    expect(assignmentRow.getAttribute('data-read')).toBe('false')
    await user.click(assignmentRow)

    await waitFor(() => expect(router.state.location.pathname).toBe('/inspector/scan'))
    expect(router.state.location.search).toContain('inspection=ASG-001')
    expect(screen.queryByRole('region', { name: 'Inspector notifications' })).toBeNull()
    expect(
      (await fieldSafeRepository.getInspectorNotifications('USR-INSP-001')).filter(
        (notification) => notification.readAt !== null,
      ),
    ).toHaveLength(1)

    cleanup()
    router.dispose()
    router = await renderAuthenticated('/inspector')
    expect(
      await screen.findByRole('button', { name: 'Notifications, 1 unread' }),
    ).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }))
    const readRow = screen.getByRole('button', {
      name: /Open New inspection assigned: MWP-003/,
    })
    expect(readRow.getAttribute('data-read')).toBe('true')
    await user.click(readRow)
    await waitFor(() => expect(router.state.location.pathname).toBe('/inspector/scan'))
  })

  it('does not read on hover or focus, but keyboard activation reads and navigates', async () => {
    const router = await renderAuthenticated('/inspector')
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Notifications, 2 unread' }),
    )
    const row = screen.getByRole('button', {
      name: /Open New inspection assigned: MWP-003/,
    })

    await user.hover(row)
    row.focus()
    expect(document.activeElement).toBe(row)
    expect(
      (await fieldSafeRepository.getInspectorNotifications('USR-INSP-001')).find(
        (notification) => notification.id === 'NTF-ASSIGNMENT-ASG-001',
      )?.readAt,
    ).toBeNull()

    await user.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/inspector/scan'))
    expect(
      (await fieldSafeRepository.getInspectorNotifications('USR-INSP-001')).find(
        (notification) => notification.id === 'NTF-ASSIGNMENT-ASG-001',
      )?.readAt,
    ).not.toBeNull()
  })

  it('keeps Mark all read and conventional panel dismissal behavior', async () => {
    await renderAuthenticated('/inspector')
    const user = userEvent.setup()
    const bell = await screen.findByRole('button', {
      name: 'Notifications, 2 unread',
    })

    await user.click(bell)
    expect(screen.queryByRole('button', { name: 'Close notifications' })).toBeNull()
    await user.click(bell)
    expect(screen.queryByRole('region', { name: 'Inspector notifications' })).toBeNull()

    await user.click(bell)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('region', { name: 'Inspector notifications' })).toBeNull()

    await user.click(bell)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Inspector notifications' })).toBeNull()
    expect(document.activeElement).toBe(bell)

    await user.click(bell)
    await user.click(screen.getByRole('button', { name: 'Mark all read' }))
    await waitFor(() => expect(screen.getByText('0 unread')).toBeTruthy())
    expect(
      (await fieldSafeRepository.getInspectorNotifications('USR-INSP-001')).every(
        (notification) => notification.readAt !== null,
      ),
    ).toBe(true)
  })

  it('creates one durable sync notification and does not duplicate it on reconstruction', async () => {
    const flow = createFlow()
    await flow.connectivity.setState('OFFLINE')
    await completeAllPass(flow)
    await flow.inspection.submitInspection(
      'ASG-001',
      'USR-INSP-001',
      'OFFLINE',
    )

    expect(await flow.connectivity.setState('ONLINE')).toBe(1)
    let syncNotifications = (
      await flow.notifications.getNotifications('USR-INSP-001')
    ).filter((notification) => notification.type === 'OFFLINE_SYNC_COMPLETED')
    expect(syncNotifications).toHaveLength(1)
    expect(syncNotifications[0]).toMatchObject({
      title: '1 inspection synced',
      targetRoute: '/inspector/history',
      readAt: null,
    })

    const reconstructed = createFlow(flow.storage)
    expect(await reconstructed.connectivity.resumePendingSynchronization()).toBe(0)
    syncNotifications = (
      await reconstructed.notifications.getNotifications('USR-INSP-001')
    ).filter((notification) => notification.type === 'OFFLINE_SYNC_COMPLETED')
    expect(syncNotifications).toHaveLength(1)
  })

  it('uses the full sync row to mark read, close, and navigate to History', async () => {
    await fieldSafeRepository.saveInspectorNotification({
      id: 'NTF-SYNC-TEST',
      userId: 'USR-INSP-001',
      type: 'OFFLINE_SYNC_COMPLETED',
      title: '2 inspections synced',
      message: 'Your offline inspections are now up to date.',
      createdAt: NOW,
      readAt: null,
      targetRoute: '/inspector/history',
      inspectionId: null,
    })
    const router = await renderAuthenticated('/inspector')
    const user = userEvent.setup()

    await user.click(
      await screen.findByRole('button', { name: 'Notifications, 3 unread' }),
    )
    expect(screen.queryByRole('button', { name: 'View history' })).toBeNull()
    const syncRow = screen.getByRole('button', {
      name: /Open 2 inspections synced/,
    })
    await user.click(syncRow)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/inspector/history'),
    )
    expect(screen.queryByRole('region', { name: 'Inspector notifications' })).toBeNull()
    expect(
      (await fieldSafeRepository.getInspectorNotifications('USR-INSP-001')).find(
        (notification) => notification.id === 'NTF-SYNC-TEST',
      )?.readAt,
    ).not.toBeNull()
  })

  it('bounds and independently scrolls a newest-first list without capping notifications', async () => {
    for (let index = 0; index < 12; index += 1) {
      await fieldSafeRepository.saveInspectorNotification({
        id: `NTF-BULK-${index}`,
        userId: 'USR-INSP-001',
        type: 'OFFLINE_SYNC_COMPLETED',
        title: `Bulk notification ${index}`,
        message: 'Your offline inspections are now up to date.',
        createdAt: new Date(Date.parse(NOW) + index * 60_000).toISOString(),
        readAt: null,
        targetRoute: '/inspector/history',
        inspectionId: null,
      })
    }
    const router = await renderAuthenticated('/inspector')
    const user = userEvent.setup()

    await user.click(
      await screen.findByRole('button', { name: 'Notifications, 14 unread' }),
    )
    const panel = screen.getByRole('region', { name: 'Inspector notifications' })
    const header = screen.getByTestId('notification-panel-header')
    const list = screen.getByTestId('notification-scroll-list')
    const rows = within(list).getAllByRole('button', { name: /Open / })

    expect(panel.className).toContain('max-h-')
    expect(panel.className).toContain('flex-col')
    expect(header.className).toContain('shrink-0')
    expect(list.className).toContain('overflow-y-auto')
    expect(list.className).toContain('overscroll-contain')
    expect(rows).toHaveLength(14)
    expect(rows[0].textContent).toContain('Bulk notification 11')
    expect(screen.getByText('Bulk notification 0')).toBeTruthy()

    fireEvent.scroll(list, { target: { scrollTop: 500 } })
    await user.click(screen.getByRole('button', { name: /Open Bulk notification 0/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inspector/history'))
  })

  it('Demo Reset restores exact deterministic notification state', async () => {
    const flow = createFlow()
    const notification = (
      await flow.notifications.getNotifications('USR-INSP-001')
    )[0]
    await flow.notifications.markRead(notification.id, 'USR-INSP-001')
    await flow.repository.resetDemoData()

    expect(await flow.notifications.getNotifications('USR-INSP-001')).toEqual(
      createFieldSafeSeedData().inspectorNotifications.filter(
        (item) => item.userId === 'USR-INSP-001',
      ),
    )
  })

  it('keeps notification centers persona-scoped and excludes Manager and Gate', async () => {
    await renderAuthenticated('/supervisor', 'priya.sharma@fieldsafe.demo')
    await screen.findByRole('heading', { name: 'Supervisor Overview' })
    expect(screen.getByRole('button', { name: /Notifications/ })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Inspector notifications' })).toBeNull()
    cleanup()

    await renderAuthenticated('/manager', 'varun.mehta@fieldsafe.demo')
    await screen.findByRole('heading', { name: 'Manager Overview' })
    expect(screen.queryByRole('button', { name: /Notifications/ })).toBeNull()
    cleanup()

    const router = createMemoryRouter(appRoutes, { initialEntries: ['/gate'] })
    render(
      <AuthProvider service={authService}>
        <RouterProvider router={router} />
      </AuthProvider>,
    )
    await screen.findByRole('heading', { name: 'Focused gate workspace' })
    expect(screen.queryByRole('button', { name: /Notifications/ })).toBeNull()
  })

  it('keeps toast feedback transient and out of persistent notification history', async () => {
    const before = await fieldSafeRepository.getInspectorNotifications('USR-INSP-001')
    const user = userEvent.setup()
    render(
      <ToastProvider durationMilliseconds={25}>
        <ToastHarness />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Submit feedback' }))
    expect(screen.getByRole('status').textContent).toContain(
      'Inspection submitted successfully.',
    )
    expect(await fieldSafeRepository.getInspectorNotifications('USR-INSP-001')).toEqual(before)
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
  })
})

describe('Inspector sticky checklist context', () => {
  it('preserves the main summary and updates compact context from shared progress', async () => {
    let observerCallback: IntersectionObserverCallback | undefined
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback
      }
      observe() {
        observerCallback?.(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        )
      }
      disconnect() {}
      unobserve() {}
      takeRecords() { return [] }
      root = null
      rootMargin = '0px'
      thresholds = [0.05]
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    await renderAuthenticated('/inspector/inspection/ASG-001')
    const user = userEvent.setup()

    expect(await screen.findByTestId('inspection-main-summary')).toBeTruthy()
    const host = screen.getByTestId('inspector-context-host')
    expect(screen.queryByTestId('sticky-inspection-context')).toBeNull()
    expect(host.previousElementSibling?.tagName).toBe('HEADER')
    expect(host.nextElementSibling?.tagName).toBe('MAIN')

    act(() => {
      observerCallback?.(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    const compact = screen.getByTestId('sticky-inspection-context')
    expect(compact.getAttribute('data-active')).toBe('true')
    expect(compact.textContent).toContain('MWP-003 · Haulotte Vertical Mast')
    expect(compact.textContent).toContain('MEWP Pre-Use Inspection')
    expect(compact.getAttribute('data-completed')).toBe('0')
    expect(compact.textContent).toContain('0 / 10 · 0%')
    expect(host.contains(compact)).toBe(true)
    expect(compact.className).not.toContain('sticky')
    expect(compact.className).not.toContain('absolute')
    expect(compact.className).not.toContain('fixed')
    expect(compact.className).not.toContain('max-h-')
    const contextBar = screen.getByTestId('sticky-context-bar')
    expect(contextBar.className).toContain('flex-wrap')
    expect(contextBar.className).toContain('sm:flex-nowrap')
    expect(contextBar.className).not.toContain('rounded')
    expect(contextBar.className).not.toContain('shadow')
    expect(contextBar.querySelector('p')?.className).toContain('break-words')
    expect(screen.getByTestId('compact-inspection-progress')).toBeTruthy()
    expect(within(compact).queryByRole('button')).toBeNull()

    await user.click(screen.getAllByRole('button', { name: 'Pass' })[0])
    await waitFor(() => expect(compact.getAttribute('data-completed')).toBe('1'))
    expect(compact.textContent).toContain('1 / 10 · 10%')
    expect(screen.getByTestId('inspection-main-summary')).toBeTruthy()
    expect(screen.getByTestId('checklist-review-cta')).toBeTruthy()
    expect(screen.getByTestId('checklist-items')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Inspector navigation' })).toBeTruthy()
  })
})
