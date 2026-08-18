import type { DefectVolumePeriod } from '../../services/managerService'

export function createRoundedIntegerTicks(
  maximumValue: number,
  targetTickCount = 6,
) {
  if (maximumValue <= 0) return [0, 1]

  const roughStep = maximumValue / Math.max(1, targetTickCount - 1)
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const normalizedStep = roughStep / magnitude
  const niceStep =
    normalizedStep <= 1
      ? 1
      : normalizedStep <= 2
        ? 2
        : normalizedStep <= 5
          ? 5
          : 10
  const step = Math.max(1, niceStep * magnitude)
  const axisMaximum = Math.ceil(maximumValue / step) * step

  return Array.from(
    { length: Math.round(axisMaximum / step) + 1 },
    (_, index) => Math.round(index * step),
  )
}

export function calculateColumnTooltipBounds(
  chartWidth: number,
  barCenterX: number,
  preferredWidth = 192,
  margin = 8,
) {
  if (chartWidth <= margin * 2) {
    return { left: 0, width: Math.max(0, chartWidth) }
  }

  const width = Math.min(preferredWidth, chartWidth - margin * 2)
  const left = Math.max(
    margin,
    Math.min(barCenterX - width / 2, chartWidth - width - margin),
  )
  return { left, width }
}

function nextMonth(key: string) {
  const [year, month] = key.split('-').map(Number)
  const next = new Date(Date.UTC(year, month, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

function labelMonth(key: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${key}-01T00:00:00.000Z`))
}

export function completeDefectVolumeSeries(
  periods: DefectVolumePeriod[],
  analyticsPeriodKeys: string[],
) {
  const keys = [...new Set([
    ...periods.map((period) => period.key),
    ...analyticsPeriodKeys,
  ])].sort()
  if (keys.length === 0) return []

  const periodsByKey = new Map(periods.map((period) => [period.key, period]))
  const completed: DefectVolumePeriod[] = []
  let key = keys[0]
  const lastKey = keys.at(-1)!

  while (key <= lastKey) {
    completed.push(
      periodsByKey.get(key) ?? {
        key,
        label: labelMonth(key),
        defectCount: 0,
      },
    )
    key = nextMonth(key)
  }

  return completed
}
