import { AlertTriangle, ArrowRight, MapPin, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import type { SupervisorReviewListItem } from '../../services/supervisorService'
import { formatDateTime } from '../../utils/format'
import { Card } from '../common/Card'
import { CardNavigationOverlay } from '../common/CardNavigationOverlay'
import { SeverityBadge } from '../common/SeverityBadge'
import { StatusBadge } from '../common/StatusBadge'
import { ReviewStatusBadge } from './WorkflowBadges'

export function ReviewCard({ review }: { review: SupervisorReviewListItem }) {
  const pending = review.inspection.reviewStatus !== 'Reviewed'
  const destination = `/supervisor/reviews/${review.inspection.id}`
  return (
    <Card className="group relative overflow-hidden transition-colors hover:border-brand-200 hover:bg-brand-50/20">
      <CardNavigationOverlay
        to={destination}
        label={`${pending ? 'Review' : 'View review'} for ${review.equipment.assetCode}`}
      />
      <div className="pointer-events-none relative z-20 flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
              {review.equipment.assetCode}
            </span>
            {!pending ? (
              <ReviewStatusBadge status="Reviewed" />
            ) : null}
            {review.inspection.result ? (
              <StatusBadge status={review.inspection.result} />
            ) : (
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-warning-100 bg-warning-50 px-2.5 py-1 text-xs font-bold text-warning-800">
                <AlertTriangle aria-hidden="true" className="size-3.5" />
                Result unavailable
              </span>
            )}
            {review.highestSeverity ? (
              <SeverityBadge severity={review.highestSeverity} />
            ) : null}
          </div>
          <h3 className="mt-2 truncate text-base font-bold text-slate-950">
            {review.equipment.name}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {review.equipment.type} · {review.checklist.name}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <UserRound aria-hidden="true" className="size-3.5" />
              {review.inspector.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-3.5" />
              {review.equipment.site}
            </span>
            <span>Submitted {formatDateTime(review.inspection.submittedAt)}</span>
            <span className="font-semibold text-slate-700">
              {review.failedCount} failed item{review.failedCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 lg:pl-4">
          <StatusBadge status={review.equipment.status} />
          <Link
            to={destination}
            className="pointer-events-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-600"
          >
            {pending ? 'Review' : 'View Review'}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </Card>
  )
}
