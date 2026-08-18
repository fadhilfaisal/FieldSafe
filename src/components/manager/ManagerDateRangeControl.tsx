import type { ManagerAnalyticsRange } from '../../services/managerService'
import { cn } from '../../utils/cn'

const presets: Array<{ value: ManagerAnalyticsRange; label: string }> = [
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '6m', label: '6M' },
  { value: 'all', label: 'All' },
]

interface ManagerDateRangeControlProps {
  value: ManagerAnalyticsRange
  onChange(value: ManagerAnalyticsRange): void
}

export function ManagerDateRangeControl({
  value,
  onChange,
}: ManagerDateRangeControlProps) {
  return (
    <div
      role="group"
      className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      aria-label="Analytics date range"
    >
      {presets.map((preset) => (
        <button
          key={preset.value}
          type="button"
          aria-pressed={value === preset.value}
          onClick={() => onChange(preset.value)}
          className={cn(
            'min-h-10 rounded-lg px-3.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600',
            value === preset.value
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
