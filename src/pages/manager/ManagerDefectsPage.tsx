import { CircleAlert, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AnalyticsBar } from '../../components/manager/AnalyticsBar'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { MetricCard } from '../../components/common/MetricCard'
import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/feedback/LoadingState'
import {
  managerService,
  type ManagerDefectAnalytics,
} from '../../services/managerService'

export function ManagerDefectsPage() {
  const [analytics, setAnalytics] = useState<ManagerDefectAnalytics | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void managerService
      .getDefectAnalytics()
      .then((nextAnalytics) => {
        if (active) setAnalytics(nextAnalytics)
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load defect visibility.')
      })
    return () => {
      active = false
    }
  }, [])

  const maximumVolume = useMemo(
    () => Math.max(1, ...(analytics?.volumeTrend.map((item) => item.defectCount) ?? [])),
    [analytics],
  )
  const maximumCategory = useMemo(
    () => Math.max(1, ...(analytics?.commonCategories.map((item) => item.defectCount) ?? [])),
    [analytics],
  )

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Management visibility" title="Defects" description="Read-only risk visibility across Inspector submissions and persisted defect records." />
      {!analytics && !error ? <LoadingState label="Loading defect visibility…" /> : null}
      {error ? <Card><EmptyState icon={TriangleAlert} title="Unable to load defects" description={error} /></Card> : null}
      {analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Defects" value={analytics.totalDefects} icon={TriangleAlert} supportingText="All reported defects in operating history" />
            <MetricCard label="Unresolved" value={analytics.unresolvedDefects} icon={ShieldAlert} supportingText="Open and under-review defects" />
            <MetricCard label="Critical" value={analytics.severityBreakdown.Critical} icon={CircleAlert} supportingText="Critical defects across all lifecycle states" />
            <MetricCard label="Resolved" value={analytics.statusBreakdown.resolved} icon={ShieldAlert} supportingText="Defects recorded as resolved" />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Severity Breakdown</h2>
              <p className="mt-1 text-sm text-slate-500">Severity dimension: all reported defects grouped by Minor, Major, or Critical risk.</p>
              {analytics.totalDefects === 0 ? (
                <EmptyState icon={ShieldAlert} title="No defect severity data" description="No defects have been recorded in the operational dataset." />
              ) : (
                <div className="mt-6 space-y-5">
                  <AnalyticsBar label="Minor" value={analytics.severityBreakdown.Minor} maximum={Math.max(1, analytics.totalDefects)} tone="brand" />
                  <AnalyticsBar label="Major" value={analytics.severityBreakdown.Major} maximum={Math.max(1, analytics.totalDefects)} tone="warning" />
                  <AnalyticsBar label="Critical" value={analytics.severityBreakdown.Critical} maximum={Math.max(1, analytics.totalDefects)} tone="danger" />
                </div>
              )}
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Defect Lifecycle</h2>
              <p className="mt-1 text-sm text-slate-500">Lifecycle dimension: current Open, Under Review, or Resolved status.</p>
              {analytics.totalDefects === 0 ? (
                <EmptyState icon={ShieldAlert} title="No defect lifecycle data" description="Lifecycle metrics will appear when defects are reported." />
              ) : (
                <div className="mt-6 space-y-5">
                  <AnalyticsBar label="Open" value={analytics.statusBreakdown.open} maximum={Math.max(1, analytics.totalDefects)} tone="danger" />
                  <AnalyticsBar label="Under Review" value={analytics.statusBreakdown.underReview} maximum={Math.max(1, analytics.totalDefects)} tone="warning" />
                  <AnalyticsBar label="Resolved" value={analytics.statusBreakdown.resolved} maximum={Math.max(1, analytics.totalDefects)} tone="success" />
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Defect Volume Over Time</h2>
              <p className="mt-1 text-sm text-slate-500">Reported defects grouped by month.</p>
              {analytics.volumeTrend.length === 0 ? (
                <EmptyState icon={TriangleAlert} title="No defect volume" description="No reported defects are available for the operating history." />
              ) : (
                <div className="mt-6 space-y-5">
                  {analytics.volumeTrend.map((period) => (
                    <AnalyticsBar key={period.key} label={period.label} value={period.defectCount} maximum={maximumVolume} tone="danger" />
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Common Defect Categories</h2>
              <p className="mt-1 text-sm text-slate-500">Checklist categories resolved from failed inspection responses.</p>
              {analytics.commonCategories.length === 0 ? (
                <EmptyState icon={TriangleAlert} title="No defect categories" description="Checklist categories will appear after defects are reported." />
              ) : (
                <div className="mt-6 space-y-5">
                  {analytics.commonCategories.slice(0, 8).map((item) => (
                    <AnalyticsBar key={item.category} label={item.category} value={item.defectCount} maximum={maximumCategory} tone="slate" />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
