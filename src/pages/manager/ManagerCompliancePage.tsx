import { ChartNoAxesCombined, CheckCircle2, ClipboardCheck, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AnalyticsBar } from '../../components/manager/AnalyticsBar'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { MetricCard } from '../../components/common/MetricCard'
import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/feedback/LoadingState'
import {
  managerService,
  type ManagerComplianceAnalytics,
} from '../../services/managerService'

export function ManagerCompliancePage() {
  const [analytics, setAnalytics] = useState<ManagerComplianceAnalytics | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void managerService
      .getComplianceAnalytics()
      .then((nextAnalytics) => {
        if (active) setAnalytics(nextAnalytics)
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load compliance data.')
      })
    return () => {
      active = false
    }
  }, [])

  const maximumPeriodVolume = useMemo(
    () => Math.max(1, ...(analytics?.trend.map((item) => item.inspectionCount) ?? [])),
    [analytics],
  )

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Management visibility" title="Compliance" description="Inspection pass performance across the persisted FieldSafe operating history." />
      {!analytics && !error ? <LoadingState label="Loading compliance visibility…" /> : null}
      {error ? <Card><EmptyState icon={ClipboardCheck} title="Unable to load compliance" description={error} /></Card> : null}
      {analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Overall Compliance" value={`${analytics.complianceRate}%`} icon={ClipboardCheck} supportingText="Passed completed inspections" />
            <MetricCard label="Completed Inspections" value={analytics.inspectionCount} icon={ChartNoAxesCombined} supportingText="Across the available historical period" />
            <MetricCard label="Passed" value={analytics.passedCount} icon={CheckCircle2} supportingText="Inspections completed without a failed response" />
            <MetricCard label="Failed" value={analytics.failedCount} icon={XCircle} supportingText="Inspections containing one or more failures" />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Compliance Trend</h2>
              <p className="mt-1 text-sm text-slate-500">Monthly performance across the seeded historical period.</p>
              <div className="mt-6 space-y-5">
                {analytics.trend.map((period) => (
                  <AnalyticsBar key={period.key} label={period.label} value={period.complianceRate} maximum={100} displayValue={`${period.complianceRate}%`} tone={period.complianceRate >= 90 ? 'success' : period.complianceRate >= 75 ? 'warning' : 'danger'} supportingText={`${period.passedCount} passed · ${period.failedCount} failed · ${period.inspectionCount} total`} />
                ))}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Inspection Volume</h2>
              <p className="mt-1 text-sm text-slate-500">Completed inspections by month.</p>
              <div className="mt-6 space-y-5">
                {analytics.trend.map((period) => (
                  <AnalyticsBar key={period.key} label={period.label} value={period.inspectionCount} maximum={maximumPeriodVolume} tone="brand" supportingText={`${period.complianceRate}% compliant`} />
                ))}
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Compliance by Equipment Type</h2>
              <p className="mt-1 text-sm text-slate-500">Performance calculated from completed inspections associated with each fleet type.</p>
            </div>
            <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
              {analytics.byEquipmentType.map((item) => (
                <AnalyticsBar key={item.equipmentType} label={item.equipmentType} value={item.complianceRate} maximum={100} displayValue={`${item.complianceRate}%`} tone={item.complianceRate >= 90 ? 'success' : item.complianceRate >= 75 ? 'warning' : 'danger'} supportingText={`${item.passedCount} passed · ${item.failedCount} failed`} />
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}
