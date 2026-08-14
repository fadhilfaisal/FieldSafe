import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '../../utils/cn'

export type SafetyStatus =
  | 'Fit'
  | 'Restricted'
  | 'Out of Service'
  | 'Pass'
  | 'Fail'
  | 'Allowed'
  | 'Denied'
  | 'Completed'

type StatusTone = 'success' | 'warning' | 'danger' | 'information'

const statusTone: Record<SafetyStatus, StatusTone> = {
  Fit: 'success',
  Pass: 'success',
  Allowed: 'success',
  Completed: 'success',
  Restricted: 'warning',
  'Out of Service': 'danger',
  Fail: 'danger',
  Denied: 'danger',
}

const toneStyles: Record<StatusTone, string> = {
  success: 'border-success-100 bg-success-50 text-success-700',
  warning: 'border-warning-100 bg-warning-50 text-warning-800',
  danger: 'border-danger-100 bg-danger-50 text-danger-700',
  information: 'border-brand-100 bg-brand-50 text-brand-700',
}

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  information: Info,
}

interface StatusBadgeProps {
  status: SafetyStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const tone = statusTone[status]
  const Icon = icons[tone]

  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide',
        toneStyles[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
      {status}
    </span>
  )
}
