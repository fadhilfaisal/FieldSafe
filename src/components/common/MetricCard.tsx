import { Info, type LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { Card } from './Card'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  supportingText?: string
  helpText?: string
  reserveLabelSpace?: boolean
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  supportingText,
  helpText,
  reserveLabelSpace = false,
}: MetricCardProps) {
  const helpId = useId()

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className={`flex items-start gap-1.5 ${reserveLabelSpace ? 'min-h-10' : 'min-h-7'}`}
          >
            <p className="text-sm font-medium text-slate-600">{label}</p>
            {helpText ? (
              <span className="group relative inline-flex">
                <button
                  type="button"
                  aria-label={`${label} definition`}
                  aria-describedby={helpId}
                  className="flex size-7 items-center justify-center rounded-full text-slate-500 hover:bg-brand-50 hover:text-brand-700 focus-visible:bg-brand-50 focus-visible:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  <Info aria-hidden="true" className="size-4" />
                </button>
                <span
                  id={helpId}
                  role="tooltip"
                  className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-56 rounded-lg bg-navy-950 px-3 py-2 text-xs font-medium leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  {helpText}
                </span>
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        {Icon ? (
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Icon aria-hidden="true" className="size-5" />
          </span>
        ) : null}
      </div>
      {supportingText ? (
        <p className="mt-3 text-xs text-slate-500">{supportingText}</p>
      ) : null}
    </Card>
  )
}
