// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

const managerServiceMock = vi.hoisted(() => ({
  getOverview: vi.fn(),
  getComplianceAnalytics: vi.fn(),
  getDefectAnalytics: vi.fn(),
}))

vi.mock('../src/services/managerService', () => ({
  managerService: managerServiceMock,
}))

import { ManagerCompliancePage } from '../src/pages/manager/ManagerCompliancePage'
import { ManagerDefectsPage } from '../src/pages/manager/ManagerDefectsPage'
import { ManagerHomePage } from '../src/pages/manager/ManagerHomePage'

beforeEach(() => {
  managerServiceMock.getOverview.mockResolvedValue({
    complianceRate: 0,
    recentInspectionCount: 0,
    openDefectCount: 0,
    equipmentStatusCounts: {
      Fit: 0,
      Restricted: 0,
      'Out of Service': 0,
    },
    totalEquipmentCount: 0,
    highestRiskEquipment: [],
  })
  managerServiceMock.getComplianceAnalytics.mockResolvedValue({
    inspectionCount: 0,
    passedCount: 0,
    failedCount: 0,
    complianceRate: 0,
    trend: [],
    byEquipmentType: [],
  })
  managerServiceMock.getDefectAnalytics.mockResolvedValue({
    totalDefects: 0,
    unresolvedDefects: 0,
    severityBreakdown: { Minor: 0, Major: 0, Critical: 0 },
    statusBreakdown: { open: 0, underReview: 0, resolved: 0 },
    volumeTrend: [],
    commonCategories: [],
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Manager empty dataset states', () => {
  it('does not describe an empty fleet as fit', async () => {
    render(
      <MemoryRouter>
        <ManagerHomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'No equipment data' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Fleet is fit' })).toBeNull()
  })

  it('shows explicit empty compliance states', async () => {
    render(<ManagerCompliancePage />)

    expect(await screen.findByRole('heading', { name: 'No pass-rate history' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'No inspection volume' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'No equipment-type pass rate' })).toBeTruthy()
  })

  it('shows explicit empty defect states', async () => {
    render(<ManagerDefectsPage />)

    expect(await screen.findByRole('heading', { name: 'No defect severity data' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'No defect volume' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'No defect categories' })).toBeTruthy()
  })
})
