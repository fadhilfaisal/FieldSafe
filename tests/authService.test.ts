import { describe, expect, it } from 'vitest'
import {
  AuthService,
  AuthenticationError,
} from '../src/auth/authService'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../src/auth/demoCredentials'
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

function createDependencies(storage = new MemoryStorage()) {
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
    auth: new AuthService(repository, sessions),
    repository,
    sessions,
    storage,
  }
}

describe('simulated authentication service', () => {
  it.each(DEMO_ACCOUNTS)(
    'authenticates the seeded $role account $email',
    async ({ email, role }) => {
      const { auth, sessions } = createDependencies()

      const user = await auth.login({ email, password: DEMO_PASSWORD })

      expect(user.email).toBe(email)
      expect(user.role).toBe(role)
      expect(sessions.getUserId()).toBe(user.id)
    },
  )

  it('rejects invalid credentials without creating a session', async () => {
    const { auth, sessions } = createDependencies()

    await expect(
      auth.login({
        email: 'arjun.nair@fieldsafe.demo',
        password: 'incorrect',
      }),
    ).rejects.toBeInstanceOf(AuthenticationError)
    expect(sessions.getUserId()).toBeNull()
  })

  it('reconstructs a valid session after service recreation', async () => {
    const { auth, repository, sessions } = createDependencies()
    const user = await auth.login({
      email: 'priya.sharma@fieldsafe.demo',
      password: DEMO_PASSWORD,
    })
    const refreshedService = new AuthService(repository, sessions)

    expect(await refreshedService.restoreSession()).toEqual(user)
  })

  it('logout clears only session state and another user sees unchanged operational data', async () => {
    const { auth, repository, sessions, storage } = createDependencies()
    const equipment = (await repository.getEquipment())[0]
    await repository.saveEquipment({
      ...equipment,
      site: 'Persisted Across Personas',
    })
    await auth.login({
      email: 'arjun.nair@fieldsafe.demo',
      password: DEMO_PASSWORD,
    })
    const operationalBeforeLogout = storage.getItem(
      FIELD_SAFE_OPERATIONAL_STORAGE_KEY,
    )

    auth.logout()

    expect(sessions.getUserId()).toBeNull()
    expect(storage.getItem(FIELD_SAFE_OPERATIONAL_STORAGE_KEY)).toBe(
      operationalBeforeLogout,
    )

    await auth.login({
      email: 'varun.mehta@fieldsafe.demo',
      password: DEMO_PASSWORD,
    })
    expect((await repository.getEquipmentById(equipment.id))?.site).toBe(
      'Persisted Across Personas',
    )
  })

  it('operational reset and session reset remain independent', async () => {
    const { auth, repository, sessions } = createDependencies()
    const user = await auth.login({
      email: 'neha.patel@fieldsafe.demo',
      password: DEMO_PASSWORD,
    })

    await repository.resetDemoData()

    expect(sessions.getUserId()).toBe(user.id)
    expect((await auth.restoreSession())?.id).toBe(user.id)
    auth.logout()
    expect(await repository.getEquipment()).toHaveLength(18)
  })
})
