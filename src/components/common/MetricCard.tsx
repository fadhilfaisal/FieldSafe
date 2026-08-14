import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  supportingText?: string
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  supportingText,
}: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
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
