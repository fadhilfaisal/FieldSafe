export interface StorageDriver {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface StorageAdapter<T> {
  read(): T | null
  write(value: T): void
  clear(): void
}
