import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const uiFiles = [
  'src/components/common/Button.tsx',
  'src/components/common/Card.tsx',
  'src/components/common/ConnectivityIndicator.tsx',
  'src/components/common/EmptyState.tsx',
  'src/components/common/MetricCard.tsx',
  'src/components/common/PageHeader.tsx',
  'src/components/common/SeverityBadge.tsx',
  'src/components/common/StatusBadge.tsx',
  'src/components/layout/BrandMark.tsx',
  'src/components/layout/FieldShell.tsx',
  'src/components/layout/GateShell.tsx',
  'src/components/layout/OperationsShell.tsx',
  'src/pages/auth/LoginPage.tsx',
  'src/pages/gate/GatePage.tsx',
  'src/pages/inspector/InspectorPages.tsx',
  'src/pages/manager/ManagerPages.tsx',
  'src/pages/shared/NotFoundPage.tsx',
  'src/pages/shared/PlaceholderPage.tsx',
  'src/pages/supervisor/SupervisorPages.tsx',
]

describe('UI storage boundary', () => {
  it('keeps browser storage access out of React components and pages', () => {
    for (const file of uiFiles) {
      const source = readFileSync(resolve(file), 'utf8')
      expect(source, file).not.toMatch(/localStorage|sessionStorage|indexedDB/)
    }
  })
})
