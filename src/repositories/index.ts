import { BrowserFieldSafeRepository } from './browserFieldSafeRepository'
import { BrowserStorageAdapter } from '../storage/browserStorageAdapter'
import type { PersistedOperationalData } from './browserFieldSafeRepository'

export const FIELD_SAFE_OPERATIONAL_STORAGE_KEY =
  'fieldsafe:operational-data:v1'

export const fieldSafeRepository = new BrowserFieldSafeRepository(
  new BrowserStorageAdapter<PersistedOperationalData>(
    FIELD_SAFE_OPERATIONAL_STORAGE_KEY,
  ),
)

export * from './browserFieldSafeRepository'
export * from './fieldSafeRepository'
