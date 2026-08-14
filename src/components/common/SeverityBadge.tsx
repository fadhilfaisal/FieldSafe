import { AlertCircle, AlertTriangle, CircleAlert } from 'lucide-react'
import { cn } from '../../utils/cn'

export type Severity = 'Minor' | 'Major' | 'Critical'

const styles: Record<Severity, string> = {
  Minor: 'border-brand-100 bg-brand-50 text-brand-700',
  Major: 'border-warning-100 bg-warning-50 text-warning-800',
  Critical: 'border-danger-100 bg-danger-50 text-danger-700',
}

const icons = {
  Minor: AlertCircle,
  Major: AlertTriangle,
  Critical: CircleAlert,
}

interface SeverityBadgeProps {
  severity: Severity
  className?: string
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const Icon = icons[severity]

  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide',
        styles[severity],
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
      {severity}
    </span>
  )
}
