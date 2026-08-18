import { CircleAlert, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { MetricCard } from '../../components/common/MetricCard'
import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/feedback/LoadingState'
import { AnalyticsColumnChart } from '../../components/manager/AnalyticsColumnChart'
import { DefectCategoryTable } from '../../components/manager/DefectCategoryTable'
import { SeverityDistribution } from '../../components/manager/SeverityDistribution'
import { completeDefectVolumeSeries } from '../../components/manager/chartMath'
import {
  managerService,
  type ManagerDefectAnalytics,
} from '../../services/managerService'

export function ManagerDefectsPage() {
  const [analytics, setAnalytics] = useState<ManagerDefectAnalytics | null>(null)
  const [analyticsPeriodKeys, setAnalyticsPeriodKeys] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void Promise.all([
      managerService.getDefectAnalytics(),
      managerService.getComplianceAnalytics().catch(() => null),
    ])
      .then(([nextAnalytics, compliance]) => {
        if (active) {
          setAnalytics(nextAnalytics)
          setAnalyticsPeriodKeys(
            compliance?.trend.map((period) => period.key) ?? [],
          )
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load defect visibility.')
      })
    return () => {
      active = false
    }
  }, [])

  const volumeTrend = analytics
    ? completeDefectVolumeSeries(analytics.volumeTrend, analyticsPeriodKeys)
    : []

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Management visibility" title="Defects" description="Read-only risk visibility across Inspector submissions and persisted defect records." />
      {!analytics && !error ? <LoadingState label="Loading defect visibility…" /> : null}
      {error ? <Card><EmptyState icon={TriangleAlert} title="Unable to load defects" description={error} /></Card> : null}
      {analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Defects" value={analytics.totalDefects} icon={TriangleAlert} helpText="All reported defects in the persisted operating history." reserveLabelSpace />
            <MetricCard label="Unresolved" value={analytics.unresolvedDefects} icon={ShieldAlert} helpText="Defects whose lifecycle state is Open or Under Review." reserveLabelSpace />
            <MetricCard label="Critical" value={analytics.severityBreakdown.Critical} icon={CircleAlert} helpText="Reported defects with Critical severity across all lifecycle states." reserveLabelSpace />
            <MetricCard label="Resolved" value={analytics.statusBreakdown.resolved} icon={ShieldAlert} helpText="Defects whose remediation has been verified and resolved." reserveLabelSpace />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
            <Card className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Defect Volume Over Time</h2>
              <p className="mt-1 text-sm text-slate-500">Reported defects grouped by month.</p>
              {volumeTrend.length === 0 ? (
                <EmptyState icon={TriangleAlert} title="No defect volume" description="No reported defects are available for the operating history." />
              ) : (
                <div className="mt-5">
                  <AnalyticsColumnChart
                    ariaLabel="Reported defect volume by month"
                    tone="danger"
                    reserveValueLabelHeadroom
                    data={volumeTrend.map((period) => ({
                      key: period.key,
                      label: period.label,
                      value: period.defectCount,
                      tooltipLines: [
                        period.label,
                        `${period.defectCount} reported ${period.defectCount === 1 ? 'defect' : 'defects'}`,
                      ],
                    }))}
                  />
                </div>
              )}
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Severity Breakdown</h2>
              <p className="mt-1 text-sm text-slate-500">All reported defects grouped by safety severity.</p>
              {analytics.totalDefects === 0 ? (
                <EmptyState icon={ShieldAlert} title="No defect severity data" description="No defects have been recorded in the operational dataset." />
              ) : (
                <div className="mt-6">
                  <SeverityDistribution
                    values={analytics.severityBreakdown}
                    getSeverityDestination={(severity) =>
                      `/manager/equipment?severity=${encodeURIComponent(severity)}`
                    }
                  />
                  <div className="mt-6 border-t border-slate-200 pt-5">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Defect lifecycle</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">Open</p><p className="mt-1 text-xl font-bold text-slate-950">{analytics.statusBreakdown.open}</p></div>
                      <div className="rounded-lg bg-warning-50 p-3"><p className="text-xs font-semibold text-warning-800">Under Review</p><p className="mt-1 text-xl font-bold text-slate-950">{analytics.statusBreakdown.underReview}</p></div>
                      <div className="rounded-lg bg-success-50 p-3"><p className="text-xs font-semibold text-success-700">Resolved</p><p className="mt-1 text-xl font-bold text-slate-950">{analytics.statusBreakdown.resolved}</p></div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <Card className="p-5 sm:p-6">
            <h2 className="text-xl font-bold text-slate-950">Common Defect Categories</h2>
            <p className="mt-1 text-sm text-slate-500">Most frequently reported checklist categories, ranked by volume.</p>
            {analytics.commonCategories.length === 0 ? (
              <EmptyState icon={TriangleAlert} title="No defect categories" description="Checklist categories will appear after defects are reported." />
            ) : (
              <div className="mt-6">
                <DefectCategoryTable
                  items={analytics.commonCategories.slice(0, 8)}
                  totalDefects={analytics.totalDefects}
                />
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}
