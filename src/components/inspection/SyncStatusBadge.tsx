import { CheckCircle2, CloudOff } from 'lucide-react'
import type { InspectionSyncStatus } from '../../domain/models'
import { cn } from '../../utils/cn'

interface SyncStatusBadgeProps {
  status: InspectionSyncStatus
  className?: string
}

export function SyncStatusBadge({
  status,
  className,
}: SyncStatusBadgeProps) {
  const pending = status === 'PENDING_SYNC'
  const Icon = pending ? CloudOff : CheckCircle2

  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide',
        pending
          ? 'border-warning-100 bg-warning-50 text-warning-800'
          : 'border-success-100 bg-success-50 text-success-700',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
      {pending ? 'Pending Sync' : 'Synced'}
    </span>
  )
}
