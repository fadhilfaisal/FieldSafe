import { useId, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../../utils/cn'
import {
  calculateColumnTooltipBounds,
  createRoundedIntegerTicks,
} from './chartMath'

export interface AnalyticsColumnDatum {
  key: string
  label: string
  value: number
  tooltipLines?: string[]
}

interface AnalyticsColumnChartProps {
  data: AnalyticsColumnDatum[]
  ariaLabel: string
  tone?: 'brand' | 'danger'
  reserveValueLabelHeadroom?: boolean
}

const barTone = {
  brand: 'bg-brand-600',
  danger: 'bg-danger-600',
}

export function AnalyticsColumnChart({
  data,
  ariaLabel,
  tone = 'brand',
  reserveValueLabelHeadroom = false,
}: AnalyticsColumnChartProps) {
  const tooltipId = useId()
  const plotRef = useRef<HTMLDivElement>(null)
  const barRefs = useRef<Array<HTMLDivElement | null>>([])
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const [tooltipBounds, setTooltipBounds] = useState({ left: 8, width: 192 })
  const activeKey = focusedKey ?? hoveredKey
  const activeIndex = data.findIndex((item) => item.key === activeKey)
  const activeItem = activeIndex >= 0 ? data[activeIndex] : null
  const ticks = createRoundedIntegerTicks(
    Math.max(0, ...data.map((item) => item.value)),
    6,
    reserveValueLabelHeadroom,
  )
  const maximum = ticks.at(-1) ?? 1

  useLayoutEffect(() => {
    if (activeIndex < 0) return
    const plot = plotRef.current
    const bar = barRefs.current[activeIndex]
    if (!plot || !bar) return
    const chartPlot = plot
    const activeBar = bar

    function updateTooltipBounds() {
      const plotRectangle = chartPlot.getBoundingClientRect()
      const barRectangle = activeBar.getBoundingClientRect()
      const chartWidth = chartPlot.clientWidth || plotRectangle.width || 320
      const barCenter =
        barRectangle.width > 0
          ? barRectangle.left - plotRectangle.left + barRectangle.width / 2
          : ((activeIndex + 0.5) / Math.max(1, data.length)) * chartWidth
      setTooltipBounds(
        calculateColumnTooltipBounds(chartWidth, barCenter),
      )
    }

    updateTooltipBounds()
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateTooltipBounds)
    observer?.observe(chartPlot)
    window.addEventListener('resize', updateTooltipBounds)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateTooltipBounds)
    }
  }, [activeIndex, data.length])

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3"
      data-testid={`${tone}-column-chart`}
      data-value-label-headroom={reserveValueLabelHeadroom ? 'reserved' : 'default'}
    >
      <div className="flex h-64 flex-col justify-between pb-1 pt-20 text-right text-[11px] font-medium tabular-nums text-slate-500" aria-hidden="true">
        {ticks.slice().reverse().map((tick) => (
          <span key={tick} data-axis-tick={tick}>{tick}</span>
        ))}
      </div>
      <div ref={plotRef} className="relative h-64 min-w-0" data-testid="column-chart-plot">
        {activeItem ? (
          <div
            id={tooltipId}
            role="tooltip"
            data-tooltip-left={tooltipBounds.left}
            data-tooltip-width={tooltipBounds.width}
            className="pointer-events-none absolute top-1 z-30 rounded-lg bg-navy-950 px-3 py-2 text-left text-xs leading-5 text-white shadow-lg"
            style={{ left: tooltipBounds.left, width: tooltipBounds.width }}
          >
            {(activeItem.tooltipLines ?? [activeItem.label, String(activeItem.value)]).map(
              (line, lineIndex) => (
                <span
                  key={line}
                  className={lineIndex === 0 ? 'block font-bold' : 'block'}
                >
                  {line}
                </span>
              ),
            )}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 top-20 flex items-end gap-3 border-b border-l border-slate-200 px-3 pt-5">
          {ticks.slice(1).map((tick) => (
            <span
              key={tick}
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-200"
              style={{ bottom: `${(tick / maximum) * 100}%` }}
            />
          ))}
          {data.map((item, index) => {
            const height =
              item.value === 0
                ? 0
                : Math.max(4, (item.value / maximum) * 100)
            const tooltipLines = item.tooltipLines ?? [item.label, String(item.value)]
            return (
              <div
                key={item.key}
                ref={(node) => {
                  barRefs.current[index] = node
                }}
                className="group relative z-10 flex h-full min-w-0 flex-1 items-end justify-center focus-visible:outline-none"
                data-chart-key={item.key}
                data-chart-value={item.value}
                tabIndex={0}
                aria-label={tooltipLines.join('. ')}
                aria-describedby={activeKey === item.key ? tooltipId : undefined}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                onFocus={() => setFocusedKey(item.key)}
                onBlur={() => setFocusedKey(null)}
              >
                <div className="relative h-full w-full max-w-16">
                  <span
                    className="absolute left-1/2 -translate-x-1/2 text-xs font-bold text-slate-800"
                    style={{ bottom: `${Math.min(92, height + 3)}%` }}
                    data-column-value-label={item.value}
                  >
                    {item.value}
                  </span>
                  <span
                    className={cn(
                      'absolute inset-x-0 bottom-0 rounded-t-md transition-shadow group-hover:ring-2 group-hover:ring-brand-200 group-focus-within:ring-2 group-focus-within:ring-brand-300',
                      barTone[tone],
                    )}
                    style={{ height: `${height}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <span aria-hidden="true" />
      <div className="mt-3 flex gap-3 px-3">
        {data.map((item) => (
          <span
            key={item.key}
            className="min-w-0 flex-1 text-center text-[11px] font-semibold text-slate-500"
            title={`${item.label}: ${item.value}`}
          >
            {item.label}
          </span>
        ))}
      </div>
      <span className="sr-only">
        {data.map((item) => `${item.label}: ${item.value}`).join('. ')}
      </span>
    </div>
  )
}
