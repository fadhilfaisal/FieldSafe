import { useState } from 'react'
import type { DefectSeverity } from '../../domain/models'

interface SeverityDistributionProps {
  values: Record<DefectSeverity, number>
}

const severities: Array<{
  severity: DefectSeverity
  color: string
  dotClass: string
}> = [
  { severity: 'Minor', color: '#0f62c9', dotClass: 'bg-brand-600' },
  { severity: 'Major', color: '#d2770d', dotClass: 'bg-warning-600' },
  { severity: 'Critical', color: '#dc2626', dotClass: 'bg-danger-600' },
]

export function SeverityDistribution({ values }: SeverityDistributionProps) {
  const [hoveredSeverity, setHoveredSeverity] =
    useState<DefectSeverity | null>(null)
  const [focusedSeverity, setFocusedSeverity] =
    useState<DefectSeverity | null>(null)
  const activeSeverity = focusedSeverity ?? hoveredSeverity
  const total = severities.reduce(
    (sum, item) => sum + values[item.severity],
    0,
  )
  let offset = 0
  const segments = severities.map((item) => {
    const percentage = total > 0 ? (values[item.severity] / total) * 100 : 0
    const segment = { ...item, percentage, offset }
    offset += percentage
    return segment
  })
  const active = segments.find((item) => item.severity === activeSeverity)

  return (
    <div
      className="grid min-w-0 items-center gap-5 2xl:grid-cols-[12rem_minmax(0,1fr)]"
      aria-label={`Defect severity distribution. ${severities
        .map((item) => `${item.severity}: ${values[item.severity]}`)
        .join(', ')}`}
      data-testid="severity-distribution"
    >
      <div className="relative mx-auto aspect-square w-52 max-w-full">
        <svg
          viewBox="0 0 220 220"
          className="size-full overflow-visible"
          role="img"
          aria-label="Interactive defect severity distribution"
        >
          <circle
            cx="110"
            cy="110"
            r="76"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="30"
          />
          {segments.map((item) => {
            const count = values[item.severity]
            const roundedPercentage = Math.round(item.percentage)
            const label = `${item.severity}. ${count} defects. ${roundedPercentage}% of reported defects.`
            return (
              <circle
                key={item.severity}
                cx="110"
                cy="110"
                r="76"
                fill="none"
                stroke={item.color}
                strokeWidth={activeSeverity === item.severity ? 36 : 30}
                pathLength="100"
                strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
                strokeDashoffset={-item.offset}
                strokeLinecap="butt"
                transform="rotate(-90 110 110)"
                className="cursor-pointer transition-[stroke-width] focus-visible:outline-none"
                tabIndex={0}
                aria-label={label}
                data-severity-segment={item.severity}
                onMouseEnter={() => setHoveredSeverity(item.severity)}
                onMouseLeave={() => setHoveredSeverity(null)}
                onFocus={() => setFocusedSeverity(item.severity)}
                onBlur={() => setFocusedSeverity(null)}
              />
            )
          })}
          <circle cx="110" cy="110" r="57" fill="white" />
        </svg>
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center text-slate-950"
          role="status"
          aria-live="polite"
        >
          {active ? (
            <>
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-800">{active.severity}</span>
              <span className="mt-1 text-base font-bold leading-5 text-slate-950">
                {values[active.severity]} {values[active.severity] === 1 ? 'defect' : 'defects'}
              </span>
              <span className="mt-1 max-w-24 text-[10px] font-semibold leading-[1.15] text-slate-600">
                {Math.round(active.percentage)}% of reported defects
              </span>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold text-slate-950">{total}</span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Defects</span>
            </>
          )}
        </div>
      </div>
      <div className="min-w-0 space-y-2.5" data-testid="severity-legend">
        {segments.map((item) => {
          const count = values[item.severity]
          const percentage = Math.round(item.percentage)
          return (
            <div
              key={item.severity}
              className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5"
              data-severity-legend-row={item.severity}
            >
              <span className={`size-2.5 rounded-full ${item.dotClass}`} aria-hidden="true" />
              <span className="min-w-0 text-sm font-bold text-slate-800">
                {item.severity}
              </span>
              <span className="whitespace-nowrap text-sm font-bold tabular-nums text-slate-950">
                {count}
              </span>
              <span className="min-w-12 whitespace-nowrap text-right text-sm font-medium tabular-nums text-slate-500">
                {percentage}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
