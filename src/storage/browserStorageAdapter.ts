import type { StorageAdapter, StorageDriver } from './storageAdapter'

export class BrowserStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'BrowserStorageError'
  }
}

function getBrowserStorage(): StorageDriver {
  if (typeof window === 'undefined') {
    throw new BrowserStorageError('Browser storage is unavailable outside a browser.')
  }

  return window.localStorage
}

export class BrowserStorageAdapter<T> implements StorageAdapter<T> {
  constructor(
    private readonly key: string,
    private readonly storageProvider: () => StorageDriver = getBrowserStorage,
  ) {}

  read(): T | null {
    try {
      const serialized = this.storageProvider().getItem(this.key)
      return serialized === null ? null : (JSON.parse(serialized) as T)
    } catch (error) {
      throw new BrowserStorageError(
        `Unable to read FieldSafe data from browser storage key "${this.key}".`,
        { cause: error },
      )
    }
  }

  write(value: T) {
    try {
      this.storageProvider().setItem(this.key, JSON.stringify(value))
    } catch (error) {
      throw new BrowserStorageError(
        `Unable to write FieldSafe data to browser storage key "${this.key}".`,
        { cause: error },
      )
    }
  }

  clear() {
    try {
      this.storageProvider().removeItem(this.key)
    } catch (error) {
      throw new BrowserStorageError(
        `Unable to clear FieldSafe browser storage key "${this.key}".`,
        { cause: error },
      )
    }
  }
}
