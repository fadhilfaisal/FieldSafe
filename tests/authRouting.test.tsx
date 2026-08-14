// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
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

function createTestAuth(storage = new MemoryStorage()) {
  const repository = new BrowserFieldSafeRepository(
    new BrowserStorageAdapter<PersistedOperationalData>(
      FIELD_SAFE_OPERATIONAL_STORAGE_KEY,
      () => storage,
    ),
  )
  const sessions = new BrowserSessionStore(
    new BrowserStorageAdapter<PersistedSession>(
      SESSION_STORAGE_KEY,
      () => storage,
    ),
  )

  return {
    service: new AuthService(repository, sessions),
    sessions,
    storage,
  }
}

function renderAt(path: string, service: AuthService) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <AuthProvider service={service}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

afterEach(() => cleanup())

describe('authentication routing', () => {
  it.each([
    {
      email: 'arjun.nair@fieldsafe.demo',
      role: 'Inspector',
      landingPath: '/inspector',
      heading: 'Inspector Home',
    },
    {
      email: 'priya.sharma@fieldsafe.demo',
      role: 'Supervisor',
      landingPath: '/supervisor',
      heading: 'Supervisor Overview',
    },
    {
      email: 'varun.mehta@fieldsafe.demo',
      role: 'Manager',
      landingPath: '/manager',
      heading: 'Manager Overview',
    },
  ])(
    'routes a successful $role login to $landingPath',
    async ({ email, role, landingPath, heading }) => {
      const { service } = createTestAuth()
      const router = renderAt('/login', service)
      const user = userEvent.setup()
      await screen.findByRole('heading', { name: 'Sign in to FieldSafe' })

      await user.click(
        screen.getByRole('button', {
          name: `Use ${role} demo account for ${email}`,
        }),
      )
      await user.click(screen.getByRole('button', { name: 'Sign In' }))

      await screen.findByRole('heading', { name: heading })
      expect(router.state.location.pathname).toBe(landingPath)
    },
  )

  it('shows an accessible error and remains on login for invalid credentials', async () => {
    const { service, sessions } = createTestAuth()
    const router = renderAt('/login', service)
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Sign in to FieldSafe' })

    await user.type(
      screen.getByLabelText('Email'),
      'arjun.nair@fieldsafe.demo',
    )
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'The email or password is incorrect',
    )
    expect(router.state.location.pathname).toBe('/login')
    expect(sessions.getUserId()).toBeNull()
  })

  it('redirects an unauthenticated protected route to login', async () => {
    const { service } = createTestAuth()
    const router = renderAt('/manager/equipment', service)

    await screen.findByRole('heading', { name: 'Sign in to FieldSafe' })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('redirects an authenticated user away from another role area', async () => {
    const { service } = createTestAuth()
    await service.login({
      email: 'arjun.nair@fieldsafe.demo',
      password: DEMO_PASSWORD,
    })
    const router = renderAt('/supervisor/reviews', service)

    await screen.findByRole('heading', { name: 'Inspector Home' })
    expect(router.state.location.pathname).toBe('/inspector')
  })

  it('reconstructs a session on refresh and logout returns to login', async () => {
    const testAuth = createTestAuth()
    await testAuth.service.login({
      email: 'priya.sharma@fieldsafe.demo',
      password: DEMO_PASSWORD,
    })
    const refreshedService = new AuthService(
      new BrowserFieldSafeRepository(
        new BrowserStorageAdapter<PersistedOperationalData>(
          FIELD_SAFE_OPERATIONAL_STORAGE_KEY,
          () => testAuth.storage,
        ),
      ),
      new BrowserSessionStore(
        new BrowserStorageAdapter<PersistedSession>(
          SESSION_STORAGE_KEY,
          () => testAuth.storage,
        ),
      ),
    )
    const router = renderAt('/supervisor', refreshedService)
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: 'Supervisor Overview' })
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    await screen.findByRole('heading', { name: 'Sign in to FieldSafe' })
    expect(router.state.location.pathname).toBe('/login')
    expect(testAuth.storage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(testAuth.storage.getItem(FIELD_SAFE_OPERATIONAL_STORAGE_KEY)).not.toBeNull()
  })

  it('keeps the Gate route public without a Gate persona', async () => {
    const { service } = createTestAuth()
    const router = renderAt('/gate', service)

    await screen.findByRole('heading', { name: 'Focused gate workspace' })
    expect(router.state.location.pathname).toBe('/gate')
  })
})
