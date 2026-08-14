import { ClipboardCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/feedback/LoadingState'
import { ReviewCard } from '../../components/supervisor/ReviewCard'
import type { InspectionReviewStatus } from '../../domain/models'
import {
  supervisorService,
  type SupervisorReviewListItem,
} from '../../services/supervisorService'
import { cn } from '../../utils/cn'

export function SupervisorReviewsPage() {
  const [filter, setFilter] = useState<InspectionReviewStatus>('Pending Review')
  const [reviews, setReviews] = useState<SupervisorReviewListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    void supervisorService
      .getReviews(filter)
      .then((items) => {
        if (active) {
          setReviews(items)
          setError('')
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load reviews.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filter])

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Supervisor workflow" title="Pending Reviews" description="Submitted inspections ordered by safety severity and submission time." />
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" aria-label="Review status filter">
        {(['Pending Review', 'Reviewed'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            aria-pressed={filter === status}
            className={cn(
              'min-h-10 rounded-lg px-4 text-sm font-semibold',
              filter === status ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            {status}
          </button>
        ))}
      </div>
      {loading ? <LoadingState label="Loading inspection reviews…" /> : null}
      {!loading && error ? <Card><EmptyState icon={ClipboardCheck} title="Unable to load reviews" description={error} /></Card> : null}
      {!loading && !error && reviews.length === 0 ? <Card><EmptyState icon={ClipboardCheck} title={`No ${filter.toLowerCase()} inspections`} description="There are no inspections in this review state." /></Card> : null}
      {!loading && !error && reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => <ReviewCard key={review.inspection.id} review={review} />)}
        </div>
      ) : null}
    </div>
  )
}
