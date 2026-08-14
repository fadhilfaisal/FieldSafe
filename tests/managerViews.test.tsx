// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
import {
  BrowserFieldSafeRepository,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import { FIELD_SAFE_OPERATIONAL_STORAGE_KEY } from '../src/repositories'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

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

async function renderManagerEquipment() {
  const storage = new MemoryStorage()
  const repository = new BrowserFieldSafeRepository(
    new BrowserStorageAdapter<PersistedOperationalData>(
      FIELD_SAFE_OPERATIONAL_STORAGE_KEY,
      () => storage,
    ),
  )
  const auth = new AuthService(
    repository,
    new BrowserSessionStore(
      new BrowserStorageAdapter<PersistedSession>(
        SESSION_STORAGE_KEY,
        () => storage,
      ),
    ),
  )
  await auth.login({
    email: 'varun.mehta@fieldsafe.demo',
    password: DEMO_PASSWORD,
  })
  const router = createMemoryRouter(appRoutes, {
    initialEntries: ['/manager/equipment'],
  })
  render(
    <AuthProvider service={auth}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

beforeEach(() => window.localStorage.clear())
afterEach(() => cleanup())

describe('Manager read-only views', () => {
  it('renders the status board and equipment detail without transactional controls', async () => {
    const router = await renderManagerEquipment()
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: 'Equipment Status' })
    expect(await screen.findByRole('heading', { name: 'Fleet Status Board' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Out of Service' })).toBeTruthy()
    expect(screen.getByLabelText('Equipment type')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /save|create|update|resolve/i })).toBeNull()

    await user.click(await screen.findByRole('link', { name: 'View TRK-001' }))
    await screen.findByRole('heading', { name: 'Volvo FMX Dump Truck' })

    expect(router.state.location.pathname).toBe('/manager/equipment/EQ-001')
    expect(screen.getByRole('heading', { name: 'Unresolved Defects' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Recent Inspection History' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /save|create|update|resolve/i })).toBeNull()
    expect(screen.queryByRole('form')).toBeNull()
  })
})
