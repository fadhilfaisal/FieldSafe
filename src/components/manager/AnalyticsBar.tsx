import { cn } from '../../utils/cn'

type AnalyticsTone = 'brand' | 'success' | 'warning' | 'danger' | 'slate'

const toneStyles: Record<AnalyticsTone, string> = {
  brand: 'bg-brand-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  danger: 'bg-danger-600',
  slate: 'bg-slate-500',
}

interface AnalyticsBarProps {
  label: string
  value: number
  maximum: number
  displayValue?: string
  tone?: AnalyticsTone
  supportingText?: string
}

export function AnalyticsBar({
  label,
  value,
  maximum,
  displayValue,
  tone = 'brand',
  supportingText,
}: AnalyticsBarProps) {
  const percentage = maximum > 0 ? Math.min(100, (value / maximum) * 100) : 0

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-800">{label}</p>
          {supportingText ? (
            <p className="mt-0.5 text-xs text-slate-500">{supportingText}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-sm font-bold text-slate-950">
          {displayValue ?? value}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full', toneStyles[tone])}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={maximum}
          aria-valuenow={value}
        />
      </div>
    </div>
  )
}
