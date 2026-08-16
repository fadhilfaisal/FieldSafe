import { CheckCircle2, Clock3, Eye, TimerReset } from 'lucide-react'
import type {
  CorrectiveActionStatus,
  DefectStatus,
  InspectionReviewStatus,
} from '../../domain/models'
import { cn } from '../../utils/cn'

const actionStyles: Record<CorrectiveActionStatus, string> = {
  Open: 'border-brand-100 bg-brand-50 text-brand-700',
  'In Progress': 'border-warning-100 bg-warning-50 text-warning-800',
  Done: 'border-success-100 bg-success-50 text-success-700',
}

export function ActionStatusBadge({
  status,
  overdue = false,
}: {
  status: CorrectiveActionStatus
  overdue?: boolean
}) {
  const Icon = status === 'Done' ? CheckCircle2 : Clock3
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
        actionStyles[status],
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {status}
      {overdue ? <span className="sr-only">, overdue</span> : null}
    </span>
  )
}

export function OverdueBadge() {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-danger-100 bg-danger-50 px-2.5 py-1 text-xs font-bold text-danger-700">
      <TimerReset aria-hidden="true" className="size-3.5" />
      Overdue
    </span>
  )
}

export function ReviewStatusBadge({
  status,
}: {
  status: InspectionReviewStatus
}) {
  const reviewed = status === 'Reviewed'
  const Icon = reviewed ? CheckCircle2 : Eye
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
        reviewed
          ? 'border-success-100 bg-success-50 text-success-700'
          : 'border-warning-100 bg-warning-50 text-warning-800',
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {status}
    </span>
  )
}

export function DefectStatusBadge({ status }: { status: DefectStatus }) {
  const resolved = status === 'Resolved'
  const underReview = status === 'Under Review'
  const Icon = resolved ? CheckCircle2 : underReview ? Eye : Clock3

  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
        resolved
          ? 'border-success-100 bg-success-50 text-success-700'
          : underReview
            ? 'border-warning-100 bg-warning-50 text-warning-800'
            : 'border-danger-100 bg-danger-50 text-danger-700',
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {status}
    </span>
  )
}
