import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function collectFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry)
    return statSync(path).isDirectory()
      ? collectFiles(path)
      : /\.(ts|tsx)$/.test(path)
        ? [path]
        : []
  })
}

const uiFiles = [
  ...collectFiles(resolve('src/components')),
  ...collectFiles(resolve('src/pages')),
]

describe('UI storage boundary', () => {
  it('keeps browser storage access out of React components and pages', () => {
    for (const file of uiFiles) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/localStorage|sessionStorage|indexedDB/)
    }
  })
})
