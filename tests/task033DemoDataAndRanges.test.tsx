// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '../src/app/router'
import { AuthProvider } from '../src/auth/AuthProvider'
import { authService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'
import { completeDefectVolumeSeries } from '../src/components/manager/chartMath'
import {
  createFieldSafeSeedData,
  SEED_HISTORICAL_MONTHLY_COUNTS,
} from '../src/data/seed/fieldSafeSeed'
import type { OperationalData } from '../src/domain/models'
import { deriveEquipmentStatus, isCorrectiveActionOverdue } from '../src/domain/safety'
import {
  BrowserFieldSafeRepository,
  OPERATIONAL_DATA_SCHEMA_VERSION,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import { InspectionService } from '../src/services/inspectionService'
import {
  ManagerService,
  type ManagerAnalyticsRange,
} from '../src/services/managerService'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

const REFERENCE_DATE = '2026-08-18T12:00:00.000Z'
const DAY_IN_MS = 86_400_000
const STORAGE_KEY = 'fieldsafe:test:task-033'

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

function createFixedServices(data = createFieldSafeSeedData(REFERENCE_DATE)) {
  const storage = new MemoryStorage()
  const adapter = new BrowserStorageAdapter<PersistedOperationalData>(
    STORAGE_KEY,
    () => storage,
  )
  adapter.write({
    schemaVersion: OPERATIONAL_DATA_SCHEMA_VERSION,
    data,
  })
  const repository = new BrowserFieldSafeRepository(adapter)
  return {
    adapter,
    repository,
    inspections: new InspectionService(repository, () => REFERENCE_DATE),
    manager: new ManagerService(repository, () => REFERENCE_DATE),
  }
}

function timestampForInspection(
  inspection: OperationalData['inspections'][number],
) {
  return inspection.submittedAt ?? inspection.completedAt
}

function rangeStart(range: ManagerAnalyticsRange) {
  const reference = new Date(REFERENCE_DATE)
  if (range === 'all') return null
  if (range === '30d') return reference.getTime() - 30 * DAY_IN_MS
  if (range === '90d') return reference.getTime() - 90 * DAY_IN_MS
  return Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 5, 1)
}

function isInRange(value: string, range: ManagerAnalyticsRange) {
  const start = rangeStart(range)
  return (start === null || Date.parse(value) >= start) &&
    Date.parse(value) <= Date.parse(REFERENCE_DATE)
}

async function renderManager(path: string) {
  await authService.login({
    email: 'varun.mehta@fieldsafe.demo',
    password: DEMO_PASSWORD,
  })
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  render(
    <AuthProvider service={authService}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('TASK-033 deterministic active demo workload', () => {
  it('provides six scoped actionable assignments with a useful due-date mix per Inspector', async () => {
    const flow = createFixedServices()
    const allQueueEquipment = new Set<string>()

    for (const inspectorId of ['USR-INSP-001', 'USR-INSP-002']) {
      const queue = await flow.inspections.getInspectorQueue(inspectorId)
      expect(queue).toHaveLength(6)
      expect(queue.every((item) => item.inspection.inspectorId === inspectorId)).toBe(true)
      expect(queue.every((item) => item.inspection.status !== 'Completed')).toBe(true)
      expect(queue.filter((item) => item.overdue)).toHaveLength(2)
      expect(queue.some((item) => !item.overdue)).toBe(true)
      expect(
        queue.some((item) => {
          const delta = Date.parse(item.inspection.dueAt) - Date.parse(REFERENCE_DATE)
          return delta >= 0 && delta <= 12 * 3_600_000
        }),
      ).toBe(true)
      expect(
        queue.some(
          (item) =>
            Date.parse(item.inspection.dueAt) - Date.parse(REFERENCE_DATE) >=
            3 * DAY_IN_MS,
        ),
      ).toBe(true)
      expect(queue.every((item) => item.draft === null)).toBe(true)
      queue.forEach((item) => allQueueEquipment.add(item.equipment.id))
    }

    expect(allQueueEquipment).toHaveLength(12)
  })

  it('keeps representative assignment notifications valid, scoped, and intentionally bounded', () => {
    const seed = createFieldSafeSeedData(REFERENCE_DATE)
    const activeById = new Map(
      seed.inspections
        .filter((inspection) => inspection.status !== 'Completed')
        .map((inspection) => [inspection.id, inspection]),
    )

    for (const inspectorId of ['USR-INSP-001', 'USR-INSP-002']) {
      const notifications = seed.inspectorNotifications.filter(
        (notification) =>
          notification.userId === inspectorId &&
          notification.type === 'NEW_ASSIGNMENT',
      )
      expect(notifications).toHaveLength(3)
      for (const notification of notifications) {
        const inspection = activeById.get(notification.inspectionId)
        expect(inspection?.inspectorId).toBe(inspectorId)
        expect(notification.targetRoute).toContain(notification.inspectionId)
      }
    }

    const supervisorNotifications = seed.inspectorNotifications.filter(
      (notification) => notification.userId === 'USR-SUP-001',
    )
    expect(supervisorNotifications).toHaveLength(2)
    for (const notification of supervisorNotifications) {
      expect(notification.type).toBe('FAILED_INSPECTION_REVIEW')
      const inspection = seed.inspections.find(
        (item) => item.id === notification.inspectionId,
      )
      expect(inspection).toMatchObject({
        status: 'Completed',
        result: 'Fail',
        reviewStatus: 'Pending Review',
      })
      expect(notification.targetRoute).toContain(notification.inspectionId)
    }
  })

  it('is reproducible for a fixed reference date and keeps schema-six browser data intact until Reset', async () => {
    expect(createFieldSafeSeedData(REFERENCE_DATE)).toEqual(
      createFieldSafeSeedData(REFERENCE_DATE),
    )

    const existing = createFieldSafeSeedData(REFERENCE_DATE)
    existing.equipment[0].site = 'Persisted evaluator location'
    existing.inspections = existing.inspections.slice(0, 5)
    const flow = createFixedServices(existing)

    await flow.repository.initialize()
    expect((await flow.repository.getEquipment())[0].site).toBe(
      'Persisted evaluator location',
    )
    expect(await flow.repository.getInspections()).toHaveLength(5)
    expect(flow.adapter.read()?.schemaVersion).toBe(
      OPERATIONAL_DATA_SCHEMA_VERSION,
    )

    await flow.repository.resetDemoData()
    const reset = flow.adapter.read()
    expect(reset?.schemaVersion).toBe(OPERATIONAL_DATA_SCHEMA_VERSION)
    expect(reset?.data.inspections.filter((item) => item.status !== 'Completed')).toHaveLength(12)
    expect(reset?.data.inspectionDrafts).toEqual([])
  })
})

describe('TASK-033 six-month operational history', () => {
  it('creates 80 varied completed inspections across six months with credible Pass and Fail coverage', () => {
    const seed = createFieldSafeSeedData(REFERENCE_DATE)
    const completed = seed.inspections.filter(
      (inspection) => inspection.status === 'Completed',
    )
    const byMonth = Object.groupBy(completed, (inspection) =>
      timestampForInspection(inspection)!.slice(0, 7),
    )
    const months = Object.keys(byMonth).sort()
    const monthlyCounts = months.map((month) => byMonth[month]!.length)
    const monthlyFailed = months.map(
      (month) =>
        byMonth[month]!.filter((inspection) => inspection.result === 'Fail')
          .length,
    )

    expect(completed).toHaveLength(80)
    expect(months).toHaveLength(6)
    expect(monthlyCounts).toEqual(SEED_HISTORICAL_MONTHLY_COUNTS)
    expect(new Set(monthlyCounts).size).toBeGreaterThan(1)
    expect(monthlyFailed).toEqual([2, 3, 2, 4, 3, 5])
    expect(
      months.every((month) => {
        const inspections = byMonth[month]!
        return inspections.some((item) => item.result === 'Pass') &&
          inspections.some((item) => item.result === 'Fail')
      }),
    ).toBe(true)
    expect(completed.filter((item) => item.result === 'Pass')).toHaveLength(61)
    expect(completed.filter((item) => item.result === 'Fail')).toHaveLength(19)
  })

  it('maintains defect, response, action, fleet-state, and equipment-type relationships', () => {
    const seed = createFieldSafeSeedData(REFERENCE_DATE)
    const responseById = new Map(
      seed.checklistResponses.map((response) => [response.id, response]),
    )
    const defectById = new Map(seed.defects.map((defect) => [defect.id, defect]))
    const completed = seed.inspections.filter(
      (inspection) => inspection.status === 'Completed',
    )
    const equipmentById = new Map(
      seed.equipment.map((equipment) => [equipment.id, equipment]),
    )
    const typeCounts = Object.groupBy(
      completed,
      (inspection) => equipmentById.get(inspection.equipmentId)!.type,
    )

    expect(seed.checklistResponses).toHaveLength(800)
    expect(
      completed.every(
        (inspection) =>
          seed.checklistResponses.filter(
            (response) => response.inspectionId === inspection.id,
          ).length === 10,
      ),
    ).toBe(true)
    expect(seed.defects).toHaveLength(19)
    expect(Object.groupBy(seed.defects, (defect) => defect.severity)).toMatchObject({
      Minor: expect.arrayContaining([expect.any(Object)]),
      Major: expect.arrayContaining([expect.any(Object)]),
      Critical: expect.arrayContaining([expect.any(Object)]),
    })
    expect(seed.defects.filter((defect) => defect.severity === 'Minor')).toHaveLength(6)
    expect(seed.defects.filter((defect) => defect.severity === 'Major')).toHaveLength(7)
    expect(seed.defects.filter((defect) => defect.severity === 'Critical')).toHaveLength(6)
    expect(new Set(seed.defects.map((defect) => defect.reportedAt.slice(0, 7)))).toHaveLength(6)
    for (const defect of seed.defects) {
      expect(responseById.get(defect.checklistResponseId)).toMatchObject({
        inspectionId: defect.inspectionId,
        result: 'Fail',
      })
    }
    for (const action of seed.correctiveActions) {
      expect(defectById.get(action.defectId)?.equipmentId).toBe(
        action.equipmentId,
      )
    }
    for (const type of ['Truck', 'Crane', 'Forklift', 'MEWP', 'Loader']) {
      expect(typeCounts[type as keyof typeof typeCounts]?.length ?? 0).toBeGreaterThan(10)
    }

    const fleetCounts = Object.groupBy(seed.equipment, (equipment) => equipment.status)
    expect(fleetCounts.Fit).toHaveLength(12)
    expect(fleetCounts.Restricted).toHaveLength(3)
    expect(fleetCounts['Out of Service']).toHaveLength(3)
    for (const equipment of seed.equipment) {
      expect(equipment.status).toBe(
        deriveEquipmentStatus(
          seed.defects.filter((defect) => defect.equipmentId === equipment.id),
        ),
      )
    }
  })

  it('provides a believable corrective-action lifecycle and due-date mix', () => {
    const seed = createFieldSafeSeedData(REFERENCE_DATE)
    const status = Object.groupBy(seed.correctiveActions, (action) => action.status)
    const unfinished = seed.correctiveActions.filter(
      (action) => action.status !== 'Done',
    )

    expect(status.Open).toHaveLength(4)
    expect(status['In Progress']).toHaveLength(2)
    expect(status.Done).toHaveLength(11)
    expect(
      unfinished.filter((action) =>
        isCorrectiveActionOverdue(action, REFERENCE_DATE),
      ),
    ).toHaveLength(2)
    expect(
      unfinished.filter((action) => action.dueAt > REFERENCE_DATE).length,
    ).toBeGreaterThan(0)
    expect(
      seed.correctiveActions.some(
        (action) =>
          action.status === 'Done' &&
          defectByAction(seed, action.defectId)?.status !== 'Resolved',
      ),
    ).toBe(true)
  })
})

function defectByAction(data: OperationalData, defectId: string) {
  return data.defects.find((defect) => defect.id === defectId)
}

describe('TASK-033 Manager analytics date ranges', () => {
  it('applies every range coherently to Compliance KPIs, trend, and equipment types', async () => {
    const data = createFieldSafeSeedData(REFERENCE_DATE)
    const flow = createFixedServices(data)

    for (const range of ['30d', '90d', '6m', 'all'] as const) {
      const analytics = await flow.manager.getComplianceAnalytics(range)
      const expected = data.inspections.filter((inspection) => {
        const timestamp = timestampForInspection(inspection)
        return inspection.status === 'Completed' &&
          inspection.result !== null &&
          timestamp !== null &&
          isInRange(timestamp, range)
      })
      const passed = expected.filter((inspection) => inspection.result === 'Pass')

      expect(analytics.inspectionCount).toBe(expected.length)
      expect(analytics.passedCount).toBe(passed.length)
      expect(analytics.failedCount).toBe(expected.length - passed.length)
      expect(analytics.trend.reduce((sum, period) => sum + period.inspectionCount, 0)).toBe(expected.length)
      expect(analytics.byEquipmentType.reduce((sum, item) => sum + item.inspectionCount, 0)).toBe(expected.length)
    }

    expect(await flow.manager.getComplianceAnalytics()).toEqual(
      await flow.manager.getComplianceAnalytics('6m'),
    )
  })

  it('filters period defect analytics while preserving the current unresolved metric', async () => {
    const data = createFieldSafeSeedData(REFERENCE_DATE)
    const flow = createFixedServices(data)
    const currentUnresolved = data.defects.filter(
      (defect) => defect.status !== 'Resolved',
    ).length

    for (const range of ['30d', '90d', '6m', 'all'] as const) {
      const analytics = await flow.manager.getDefectAnalytics(range)
      const expected = data.defects.filter((defect) =>
        isInRange(defect.reportedAt, range),
      )

      expect(analytics.totalDefects).toBe(expected.length)
      expect(analytics.unresolvedDefects).toBe(currentUnresolved)
      expect(Object.values(analytics.severityBreakdown).reduce((sum, value) => sum + value, 0)).toBe(expected.length)
      expect(analytics.commonCategories.reduce((sum, item) => sum + item.defectCount, 0)).toBe(expected.length)
    }
  })

  it('keeps zero-value months represented by the page-wide inspection period', async () => {
    const data = createFieldSafeSeedData(REFERENCE_DATE)
    const internalMonth = '2026-06'
    data.defects = data.defects.filter(
      (defect) => !defect.reportedAt.startsWith(internalMonth),
    )
    const flow = createFixedServices(data)
    const [defects, compliance] = await Promise.all([
      flow.manager.getDefectAnalytics('6m'),
      flow.manager.getComplianceAnalytics('6m'),
    ])
    const reportedByMonth = new Map(
      defects.volumeTrend.map((period) => [period.key, period.defectCount]),
    )
    const completedSeries = completeDefectVolumeSeries(
      defects.volumeTrend,
      compliance.trend.map((period) => period.key),
    )

    expect(compliance.trend.map((period) => period.key)).toContain(internalMonth)
    expect(reportedByMonth.has(internalMonth)).toBe(false)
    expect(
      completedSeries.find((period) => period.key === internalMonth),
    ).toMatchObject({ defectCount: 0 })
  })

  it('uses URL-backed presets, retains refreshable URLs, and safely defaults invalid ranges', async () => {
    const router = await renderManager('/manager/compliance')
    expect(
      (await screen.findByRole('button', { name: '6M' })).getAttribute(
        'aria-pressed',
      ),
    ).toBe('true')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '90D' }))
    expect(new URLSearchParams(router.state.location.search).get('range')).toBe(
      '90d',
    )

    cleanup()
    const invalid = await renderManager('/manager/compliance?range=invalid')
    expect(
      (await screen.findByRole('button', { name: '6M' })).getAttribute(
        'aria-pressed',
      ),
    ).toBe('true')
    expect(invalid.state.location.search).toBe('?range=invalid')

    cleanup()
    const defects = await renderManager('/manager/defects?range=30d')
    expect(
      (await screen.findByRole('button', { name: '30D' })).getAttribute(
        'aria-pressed',
      ),
    ).toBe('true')
    expect(new URLSearchParams(defects.state.location.search).get('range')).toBe(
      '30d',
    )
    expect(await screen.findByText('Currently Unresolved')).toBeTruthy()
  })
})
