// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { getMetricTooltipPlacement } from '../src/components/common/metricTooltip'
import {
  calculateColumnTooltipBounds,
  completeDefectVolumeSeries,
  createRoundedIntegerTicks,
} from '../src/components/manager/chartMath'
import { ManagerCompliancePage } from '../src/pages/manager/ManagerCompliancePage'
import { ManagerDefectsPage } from '../src/pages/manager/ManagerDefectsPage'
import { managerService } from '../src/services/managerService'

beforeEach(() => window.localStorage.clear())
afterEach(() => cleanup())

describe('TASK-029 Pass C Manager analytics presentation', () => {
  it('generates rounded integer axes and retains zero-value months', () => {
    expect(createRoundedIntegerTicks(21)).toEqual([0, 5, 10, 15, 20, 25])
    expect(createRoundedIntegerTicks(0)).toEqual([0, 1])
    expect(createRoundedIntegerTicks(63).every(Number.isInteger)).toBe(true)

    expect(
      completeDefectVolumeSeries(
        [
          { key: '2026-07', label: 'Jul 2026', defectCount: 3 },
          { key: '2026-08', label: 'Aug 2026', defectCount: 4 },
        ],
        ['2026-06', '2026-07', '2026-08'],
      ),
    ).toEqual([
      { key: '2026-06', label: 'Jun 2026', defectCount: 0 },
      { key: '2026-07', label: 'Jul 2026', defectCount: 3 },
      { key: '2026-08', label: 'Aug 2026', defectCount: 4 },
    ])
  })

  it('positions shared KPI tooltips inward at viewport edges', () => {
    expect(getMetricTooltipPlacement(4, 28, 800)).toBe('left')
    expect(getMetricTooltipPlacement(768, 28, 800)).toBe('right')
    expect(getMetricTooltipPlacement(386, 28, 800)).toBe('center')
  })

  it('keeps column tooltips inside the chart near both horizontal edges', () => {
    expect(calculateColumnTooltipBounds(400, 20)).toEqual({
      left: 8,
      width: 192,
    })
    expect(calculateColumnTooltipBounds(400, 380)).toEqual({
      left: 200,
      width: 192,
    })
    expect(calculateColumnTooltipBounds(400, 200)).toEqual({
      left: 104,
      width: 192,
    })
    expect(calculateColumnTooltipBounds(180, 90)).toEqual({
      left: 8,
      width: 164,
    })
  })

  it('renders persisted compliance trend, volume, and equipment-type comparison data', async () => {
    const analytics = await managerService.getComplianceAnalytics()
    render(
      <MemoryRouter>
        <ManagerCompliancePage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Compliance' })).toBeTruthy()
    expect(screen.getByText('Inspection Pass Rate')).toBeTruthy()

    const trend = await screen.findByRole('img', {
      name: 'Inspection pass rate trend',
    })
    const trendPoints = [...trend.querySelectorAll('[data-chart-key]')]
    expect(trendPoints).toHaveLength(analytics.trend.length)
    expect(
      trendPoints.map((point) => Number(point.getAttribute('data-chart-value'))),
    ).toEqual(analytics.trend.map((period) => period.complianceRate))
    const firstPoint = trend.querySelector<SVGGElement>('g[tabindex="0"]')!
    expect(firstPoint.getAttribute('aria-label')).toContain('pass rate')
    expect(firstPoint.getAttribute('aria-label')).toContain(
      'inspections passed',
    )
    fireEvent.mouseEnter(firstPoint)
    fireEvent.focus(firstPoint)
    const pointTooltip = firstPoint.querySelector('[role="tooltip"]')!
    expect(pointTooltip.textContent).toContain(analytics.trend[0].label)
    expect(pointTooltip.className.baseVal).toContain('group-hover:opacity-100')
    expect(pointTooltip.className.baseVal).toContain('group-focus:opacity-100')

    const volume = screen.getByRole('img', {
      name: 'Completed inspection volume by month',
    })
    expect(
      [...volume.querySelectorAll('[data-axis-tick]')].map((tick) =>
        Number(tick.getAttribute('data-axis-tick')),
      ),
    ).toEqual([25, 20, 15, 10, 5, 0])
    expect(
      [...volume.querySelectorAll('[data-chart-value]')].map((bar) =>
        Number(bar.getAttribute('data-chart-value')),
      ),
    ).toEqual(analytics.trend.map((period) => period.inspectionCount))
    const firstColumn = volume.querySelector<HTMLElement>('[tabindex="0"]')!
    expect(firstColumn.getAttribute('aria-label')).toContain(
      'completed inspections',
    )
    fireEvent.mouseEnter(firstColumn)
    const hoverTooltip = document.getElementById(
      firstColumn.getAttribute('aria-describedby')!,
    )!
    expect(hoverTooltip.textContent).toContain(analytics.trend[0].label)
    expect(hoverTooltip.className).toContain('top-1')
    fireEvent.focus(firstColumn)
    const columnTooltip = document.getElementById(
      firstColumn.getAttribute('aria-describedby')!,
    )!
    expect(columnTooltip.textContent).toContain(analytics.trend[0].label)
    expect(Number(columnTooltip.getAttribute('data-tooltip-left'))).toBeGreaterThanOrEqual(8)
    expect(
      Number(columnTooltip.getAttribute('data-tooltip-left')) +
        Number(columnTooltip.getAttribute('data-tooltip-width')),
    ).toBeLessThanOrEqual(312)
    const columns = volume.querySelectorAll<HTMLElement>('[tabindex="0"]')
    fireEvent.blur(firstColumn)
    fireEvent.mouseLeave(firstColumn)
    const lastColumn = columns[columns.length - 1]
    fireEvent.focus(lastColumn)
    const lastTooltip = document.getElementById(
      lastColumn.getAttribute('aria-describedby')!,
    )!
    expect(Number(lastTooltip.getAttribute('data-tooltip-left'))).toBe(120)
    expect(
      Number(lastTooltip.getAttribute('data-tooltip-left')) +
        Number(lastTooltip.getAttribute('data-tooltip-width')),
    ).toBe(312)

    const table = screen.getByTestId('equipment-performance-table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(analytics.byEquipmentType.length)
    analytics.byEquipmentType.forEach((item, index) => {
      expect(rows[index].textContent).toContain(item.equipmentType)
      expect(rows[index].textContent).toContain(String(item.inspectionCount))
      expect(rows[index].textContent).toContain(String(item.passedCount))
      expect(rows[index].textContent).toContain(String(item.failedCount))
      expect(rows[index].textContent).toContain(`${item.complianceRate}%`)
    })
  })

  it('renders persisted defect volume, semantic severity distribution, and ranked categories', async () => {
    const analytics = await managerService.getDefectAnalytics()
    const compliance = await managerService.getComplianceAnalytics()
    const completedVolume = completeDefectVolumeSeries(
      analytics.volumeTrend,
      compliance.trend.map((period) => period.key),
    )
    render(
      <MemoryRouter>
        <ManagerDefectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Defects' })).toBeTruthy()
    const volume = screen.getByRole('img', {
      name: 'Reported defect volume by month',
    })
    expect(
      [...volume.querySelectorAll('[data-chart-value]')].map((bar) =>
        Number(bar.getAttribute('data-chart-value')),
      ),
    ).toEqual(completedVolume.map((period) => period.defectCount))
    expect(completedVolume.some((period) => period.defectCount === 0)).toBe(true)
    const zeroMonth = completedVolume.find((period) => period.defectCount === 0)!
    const zeroColumn = volume.querySelector<HTMLElement>(
      `[data-chart-key="${zeroMonth.key}"]`,
    )!
    expect(zeroColumn.getAttribute('aria-label')).toContain(
      '0 reported defects',
    )
    expect(zeroColumn.getAttribute('tabindex')).toBe('0')

    const severity = screen.getByTestId('severity-distribution')
    const severityStatus = within(severity).getByRole('status')
    expect(severityStatus.textContent).toContain(String(analytics.totalDefects))
    expect(severityStatus.textContent).toContain('Defects')
    expect(severity.className).toContain('min-w-0')
    expect(severity.className).toContain('2xl:grid-cols')
    const legend = screen.getByTestId('severity-legend')
    expect(legend.className).toContain('min-w-0')
    expect(severity.getAttribute('aria-label')).toContain(
      `Minor: ${analytics.severityBreakdown.Minor}`,
    )
    expect(severity.getAttribute('aria-label')).toContain(
      `Major: ${analytics.severityBreakdown.Major}`,
    )
    expect(severity.getAttribute('aria-label')).toContain(
      `Critical: ${analytics.severityBreakdown.Critical}`,
    )
    expect(severity.querySelector('[data-severity-legend-row="Minor"]')?.firstElementChild?.className).toContain('bg-brand-600')
    expect(severity.querySelector('[data-severity-legend-row="Major"]')?.firstElementChild?.className).toContain('bg-warning-600')
    expect(severity.querySelector('[data-severity-legend-row="Critical"]')?.firstElementChild?.className).toContain('bg-danger-600')
    expect(
      [...severity.querySelectorAll('[data-severity-legend-row]')].every(
        (row) =>
          row.className.includes('minmax(0,1fr)') &&
          row.className.includes('min-w-0'),
      ),
    ).toBe(true)
    const severitySegments = severity.querySelectorAll(
      '[data-severity-segment]',
    )
    expect(severitySegments).toHaveLength(3)
    expect(
      [...severitySegments].every(
        (segment) =>
          segment.getAttribute('tabindex') === '0' &&
          segment.getAttribute('aria-label')?.includes('reported defects'),
      ),
    ).toBe(true)
    const criticalSegment = severity.querySelector<SVGCircleElement>(
      '[data-severity-segment="Critical"]',
    )!
    const minorSegment = severity.querySelector<SVGCircleElement>(
      '[data-severity-segment="Minor"]',
    )!
    fireEvent.mouseEnter(minorSegment)
    expect(severityStatus.textContent).toContain('Minor')
    expect(severityStatus.textContent).toContain(
      `${analytics.severityBreakdown.Minor} defects`,
    )
    expect(severityStatus.textContent).toContain('% of reported defects')
    fireEvent.mouseLeave(minorSegment)
    expect(severityStatus.textContent).toContain(String(analytics.totalDefects))
    expect(severityStatus.textContent).toContain('Defects')
    fireEvent.focus(criticalSegment)
    expect(severityStatus.textContent).toContain('Critical')
    expect(severityStatus.textContent).toContain(
      `${analytics.severityBreakdown.Critical} defects`,
    )
    expect(severityStatus.textContent).toContain('% of reported defects')

    const categories = screen.getByTestId('ranked-defect-categories')
    const categoryRows = within(categories).getAllByRole('row').slice(1)
    expect(
      categoryRows.map((row) => ({
        category: row.getAttribute('data-category'),
        defectCount: Number(row.getAttribute('data-count')),
      })),
    ).toEqual(
      analytics.commonCategories.slice(0, 8).map((item) => ({
        category: item.category,
        defectCount: item.defectCount,
      })),
    )
    const represented = analytics.commonCategories.slice(0, 8)
    represented.slice(1).forEach((item, index) => {
      const previous = represented[index]
      expect(
        previous.defectCount > item.defectCount ||
          (previous.defectCount === item.defectCount &&
            previous.category.localeCompare(item.category) <= 0),
      ).toBe(true)
    })
    expect(within(categories).getByText('% of total')).toBeTruthy()
  })
})
