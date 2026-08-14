// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '../src/app/router'
import { AuthProvider } from '../src/auth/AuthProvider'
import { AuthService } from '../src/auth/authService'
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

function renderPublicGate() {
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
  const router = createMemoryRouter(appRoutes, { initialEntries: ['/gate'] })
  render(
    <AuthProvider service={auth}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

beforeEach(() => window.localStorage.clear())
afterEach(() => cleanup())

describe('public Gate experience', () => {
  it('allows an unauthenticated equipment check and another scan', async () => {
    const router = renderPublicGate()
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: 'Focused gate workspace' })
    expect(router.state.location.pathname).toBe('/gate')
    expect(screen.queryByRole('heading', { name: 'Sign in to FieldSafe' })).toBeNull()

    await user.selectOptions(screen.getByLabelText('Demo equipment selection'), 'EQ-001')
    await user.click(screen.getByRole('button', { name: 'Simulate Scan' }))

    expect(await screen.findByRole('heading', { name: 'DENIED' })).toBeTruthy()
    expect(screen.getByText('TRK-001')).toBeTruthy()
    expect(screen.getByText('Out of Service')).toBeTruthy()
    expect(screen.getByText(/must not enter or operate/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Check Another Equipment' }))
    expect(screen.getByRole('heading', { name: 'Focused gate workspace' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Simulate Scan' })).toBeTruthy()
  })
})
