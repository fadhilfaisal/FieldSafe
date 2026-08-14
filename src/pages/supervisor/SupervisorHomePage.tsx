import {
  AlertTriangle,
  ClipboardCheck,
  ShieldAlert,
  TimerReset,
  Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { MetricCard } from '../../components/common/MetricCard'
import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CorrectiveActionCard } from '../../components/supervisor/CorrectiveActionCard'
import { ReviewCard } from '../../components/supervisor/ReviewCard'
import {
  supervisorService,
  type SupervisorDashboard,
} from '../../services/supervisorService'

export function SupervisorHomePage() {
  const [dashboard, setDashboard] = useState<SupervisorDashboard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void supervisorService
      .getDashboard()
      .then((nextDashboard) => {
        if (active) setDashboard(nextDashboard)
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load Supervisor operations.',
          )
        }
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Operations workspace"
        title="Supervisor Overview"
        description="Prioritized inspection reviews and corrective work requiring attention."
      />

      {!dashboard && !error ? <LoadingState label="Loading operations overview…" /> : null}
      {error ? (
        <Card>
          <EmptyState icon={AlertTriangle} title="Unable to load overview" description={error} />
        </Card>
      ) : null}

      {dashboard ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Pending Reviews" value={dashboard.pendingReviews.length} icon={ClipboardCheck} supportingText="Submitted inspections awaiting acknowledgement" />
            <MetricCard label="Open Actions" value={dashboard.openActionCount} icon={Wrench} supportingText="Open and in-progress corrective work" />
            <MetricCard label="Overdue Actions" value={dashboard.overdueActionCount} icon={TimerReset} supportingText="Unfinished actions past their due date" />
            <MetricCard label="Critical / OOS" value={`${dashboard.criticalDefectCount} / ${dashboard.outOfServiceCount}`} icon={ShieldAlert} supportingText="Unresolved critical defects / out-of-service assets" />
          </div>

          <section aria-labelledby="dashboard-reviews-title" className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Priority queue</p>
                <h2 id="dashboard-reviews-title" className="mt-1 text-xl font-bold text-slate-950">Pending Reviews</h2>
              </div>
              <Link to="/supervisor/reviews" className="text-sm font-bold text-brand-700 hover:text-brand-600">View all reviews</Link>
            </div>
            {dashboard.pendingReviews.length > 0 ? (
              <div className="space-y-3">
                {dashboard.pendingReviews.slice(0, 4).map((review) => (
                  <ReviewCard key={review.inspection.id} review={review} />
                ))}
              </div>
            ) : (
              <Card><EmptyState icon={ClipboardCheck} title="No pending reviews" description="All submitted inspections have been acknowledged." /></Card>
            )}
          </section>

          <section aria-labelledby="dashboard-actions-title" className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 id="dashboard-actions-title" className="text-xl font-bold text-slate-950">Corrective Actions Requiring Attention</h2>
              <Link to="/supervisor/actions" className="text-sm font-bold text-brand-700 hover:text-brand-600">View all actions</Link>
            </div>
            {dashboard.actions.filter((item) => item.action.status !== 'Done').length > 0 ? (
              <div className="space-y-3">
                {dashboard.actions.filter((item) => item.action.status !== 'Done').slice(0, 4).map((item) => (
                  <CorrectiveActionCard key={item.action.id} item={item} />
                ))}
              </div>
            ) : (
              <Card><EmptyState icon={Wrench} title="No open corrective actions" description="There is no corrective work requiring attention." /></Card>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
