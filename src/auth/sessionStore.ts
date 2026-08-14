import { BrowserStorageAdapter } from '../storage/browserStorageAdapter'
import type { StorageAdapter } from '../storage/storageAdapter'

export const SESSION_STORAGE_KEY = 'fieldsafe:session:v1'
export const SESSION_SCHEMA_VERSION = 1 as const

export interface PersistedSession {
  schemaVersion: typeof SESSION_SCHEMA_VERSION
  userId: string
}

export interface SessionStore {
  getUserId(): string | null
  saveUserId(userId: string): void
  clear(): void
}

export class BrowserSessionStore implements SessionStore {
  constructor(
    private readonly storage: StorageAdapter<PersistedSession>,
  ) {}

  getUserId() {
    const session = this.storage.read()

    if (
      session === null ||
      session.schemaVersion !== SESSION_SCHEMA_VERSION ||
      typeof session.userId !== 'string' ||
      session.userId.length === 0
    ) {
      if (session !== null) this.storage.clear()
      return null
    }

    return session.userId
  }

  saveUserId(userId: string) {
    this.storage.write({
      schemaVersion: SESSION_SCHEMA_VERSION,
      userId,
    })
  }

  clear() {
    this.storage.clear()
  }
}

export const sessionStore = new BrowserSessionStore(
  new BrowserStorageAdapter<PersistedSession>(SESSION_STORAGE_KEY),
)
