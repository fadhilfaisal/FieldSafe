import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry)
    return statSync(path).isDirectory()
      ? collectSourceFiles(path)
      : /\.(ts|tsx)$/.test(path)
        ? [path]
        : []
  })
}

describe('session storage boundary', () => {
  it('defines the session storage key only in the session store abstraction', () => {
    const matches = collectSourceFiles(resolve('src')).filter((file) =>
      readFileSync(file, 'utf8').includes('fieldsafe:session:v1'),
    )

    expect(matches).toEqual([
      resolve('src/auth/sessionStore.ts'),
    ])
  })
})
