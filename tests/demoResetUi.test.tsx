// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '../src/app/router'
import { AuthProvider } from '../src/auth/AuthProvider'
import { AuthService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'
import {
  BrowserSessionStore,
  SESSION_STORAGE_KEY,
  type PersistedSession,
} from '../src/auth/sessionStore'
import { createFieldSafeSeedData } from '../src/data/seed/fieldSafeSeed'
import {
  BrowserFieldSafeRepository,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import { FIELD_SAFE_OPERATIONAL_STORAGE_KEY } from '../src/repositories'
import * as demoDataService from '../src/services/demoDataService'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

vi.mock('../src/services/demoDataService', () => ({
  initializeFieldSafeData: vi.fn(),
  resetDemoData: vi.fn(),
}))

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

function createTestDependencies() {
  const storage = new MemoryStorage()
  const operationalAdapter =
    new BrowserStorageAdapter<PersistedOperationalData>(
      FIELD_SAFE_OPERATIONAL_STORAGE_KEY,
      () => storage,
    )
  const repository = new BrowserFieldSafeRepository(operationalAdapter)
  const sessions = new BrowserSessionStore(
    new BrowserStorageAdapter<PersistedSession>(
      SESSION_STORAGE_KEY,
      () => storage,
    ),
  )
  const auth = new AuthService(repository, sessions)

  return { auth, operationalAdapter, repository, sessions }
}

async function renderAuthenticatedProfile() {
  const dependencies = createTestDependencies()
  const authenticatedUser = await dependencies.auth.login({
    email: 'arjun.nair@fieldsafe.demo',
    password: DEMO_PASSWORD,
  })
  const router = createMemoryRouter(appRoutes, {
    initialEntries: ['/inspector/profile'],
  })
  render(
    <AuthProvider service={dependencies.auth}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  await screen.findByRole('heading', { name: 'Profile' })

  return { ...dependencies, authenticatedUser, router }
}

afterEach(() => {
  cleanup()
  vi.mocked(demoDataService.resetDemoData).mockReset()
})

describe('Inspector Demo Controls', () => {
  it('is available only inside the authenticated Inspector Profile route', async () => {
    const { router } = await renderAuthenticatedProfile()

    expect(router.state.location.pathname).toBe('/inspector/profile')
    expect(screen.getByRole('heading', { name: 'Demo Controls' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Arjun Nair' })).toBeTruthy()
    expect(screen.getAllByText('Inspector').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Reset Demo Data' })).toBeTruthy()
  })

  it('requires confirmation and Cancel preserves modified operational data', async () => {
    const { repository } = await renderAuthenticatedProfile()
    const equipment = (await repository.getEquipment())[0]
    await repository.saveEquipment({
      ...equipment,
      site: 'Modified Demo Site',
    })
    vi.mocked(demoDataService.resetDemoData).mockImplementation(() =>
      repository.resetDemoData(),
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Reset Demo Data' }))
    const dialog = screen.getByRole('dialog', {
      name: 'Reset FieldSafe demo data?',
    })
    expect(demoDataService.resetDemoData).not.toHaveBeenCalled()
    expect(within(dialog).getByText('Your current login session will remain active.')).toBeTruthy()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect((await repository.getEquipmentById(equipment.id))?.site).toBe(
      'Modified Demo Site',
    )
    expect(demoDataService.resetDemoData).not.toHaveBeenCalled()
  })

  it('resets operational changes and drafts while retaining the authenticated session', async () => {
    const {
      auth,
      authenticatedUser,
      operationalAdapter,
      repository,
      router,
      sessions,
    } = await renderAuthenticatedProfile()
    const equipment = (await repository.getEquipment())[0]
    await repository.saveEquipment({ ...equipment, status: 'Out of Service' })
    await repository.saveInspectionDraft({
      inspectionId: 'ASG-001',
      responses: [
        {
          checklistItemId: 'CLI-MEWP-01',
          result: 'Pass',
          defect: null,
        },
      ],
      signature: null,
      updatedAt: '2026-08-14T10:00:00.000Z',
    })
    vi.mocked(demoDataService.resetDemoData).mockImplementation(() =>
      repository.resetDemoData(),
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Reset Demo Data' }))
    const dialog = screen.getByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Reset Demo Data' }),
    )

    await screen.findByText('Demo data restored successfully.')
    expect(router.state.location.pathname).toBe('/inspector')
    expect(demoDataService.resetDemoData).toHaveBeenCalledOnce()
    expect(operationalAdapter.read()?.data).toEqual(createFieldSafeSeedData())
    expect(await repository.getInspectionDraft('ASG-001')).toBeNull()
    expect(sessions.getUserId()).toBe(authenticatedUser.id)
    expect((await auth.restoreSession())?.id).toBe(authenticatedUser.id)
    expect(screen.getByText('Good day, Arjun')).toBeTruthy()
  })

  it('supports Escape cancellation and restores focus to the reset trigger', async () => {
    await renderAuthenticatedProfile()
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Reset Demo Data' })
    await user.click(trigger)

    expect(screen.getByRole('button', { name: 'Cancel' })).toBe(
      document.activeElement,
    )
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(trigger).toBe(document.activeElement)
    expect(demoDataService.resetDemoData).not.toHaveBeenCalled()
  })

  it('shows reset failure without clearing the session and allows retry', async () => {
    const { authenticatedUser, repository, router, sessions } =
      await renderAuthenticatedProfile()
    vi.mocked(demoDataService.resetDemoData)
      .mockRejectedValueOnce(new Error('Demo data could not be restored.'))
      .mockImplementationOnce(() => repository.resetDemoData())
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Reset Demo Data' }))
    let dialog = screen.getByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Reset Demo Data' }),
    )

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Demo data could not be restored.',
    )
    expect(router.state.location.pathname).toBe('/inspector/profile')
    expect(sessions.getUserId()).toBe(authenticatedUser.id)

    dialog = screen.getByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Reset Demo Data' }),
    )
    await screen.findByText('Demo data restored successfully.')
    expect(demoDataService.resetDemoData).toHaveBeenCalledTimes(2)
  })
})
