import { Info, type LucideIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Card } from './Card'
import {
  getMetricTooltipPlacement,
  type MetricTooltipPlacement,
} from './metricTooltip'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  supportingText?: string
  helpText?: string
  reserveLabelSpace?: boolean
  iconVariant?: 'brand' | 'quiet'
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  supportingText,
  helpText,
  reserveLabelSpace = false,
  iconVariant = 'brand',
}: MetricCardProps) {
  const helpId = useId()
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const [tooltipPlacement, setTooltipPlacement] =
    useState<MetricTooltipPlacement>('center')

  function positionTooltip() {
    const button = helpButtonRef.current
    if (!button) return
    const bounds = button.getBoundingClientRect()
    setTooltipPlacement(
      getMetricTooltipPlacement(bounds.left, bounds.width, window.innerWidth),
    )
  }

  const tooltipPlacementClass =
    tooltipPlacement === 'left'
      ? 'left-0'
      : tooltipPlacement === 'right'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2'

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className={`flex items-start gap-1.5 ${reserveLabelSpace ? 'min-h-12' : 'min-h-7'}`}
          >
            <p
              className={
                reserveLabelSpace
                  ? 'text-xs font-semibold leading-4 text-slate-600'
                  : 'text-sm font-medium text-slate-600'
              }
            >
              {label}
            </p>
            {helpText ? (
              <span
                className="group relative inline-flex"
                onMouseEnter={positionTooltip}
              >
                <button
                  ref={helpButtonRef}
                  type="button"
                  aria-label={`${label} definition`}
                  aria-describedby={helpId}
                  onFocus={positionTooltip}
                  className="flex size-7 items-center justify-center rounded-full text-slate-500 hover:bg-brand-50 hover:text-brand-700 focus-visible:bg-brand-50 focus-visible:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  <Info aria-hidden="true" className="size-4" />
                </button>
                <span
                  id={helpId}
                  role="tooltip"
                  data-tooltip-placement={tooltipPlacement}
                  className={`pointer-events-none absolute top-full z-30 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-lg bg-navy-950 px-3 py-2 text-xs font-medium leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${tooltipPlacementClass}`}
                >
                  {helpText}
                </span>
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        {Icon ? (
          <span
            className={
              iconVariant === 'quiet'
                ? 'flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-brand-700'
                : 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700'
            }
            data-icon-variant={iconVariant}
          >
            <Icon aria-hidden="true" className={iconVariant === 'quiet' ? 'size-4.5' : 'size-5'} />
          </span>
        ) : null}
      </div>
      {supportingText ? (
        <p className="mt-3 text-xs text-slate-500">{supportingText}</p>
      ) : null}
    </Card>
  )
}
