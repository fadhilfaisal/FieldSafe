// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
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

async function renderInspectorRoute(path: string) {
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
    email: 'arjun.nair@fieldsafe.demo',
    password: DEMO_PASSWORD,
  })
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <AuthProvider service={auth}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

beforeEach(() => window.localStorage.clear())
afterEach(() => cleanup())

describe('Inspector stale and invalid review routes', () => {
  it('redirects an incomplete deep-link review back to a safe checklist action', async () => {
    await renderInspectorRoute('/inspector/inspection/ASG-001/review')

    expect(await screen.findByRole('heading', { name: 'Review not ready' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Return to Checklist' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'FieldSafe could not open this page' })).toBeNull()
  })

  it('shows a useful unavailable state for an invalid inspection ID', async () => {
    await renderInspectorRoute('/inspector/inspection/NOT-A-REAL-ID/review')

    expect(await screen.findByRole('heading', { name: 'Review unavailable' })).toBeTruthy()
    expect(screen.getByText('Inspection not found.')).toBeTruthy()
  })
})
