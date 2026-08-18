import { ChartNoAxesCombined, CheckCircle2, ClipboardCheck, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { MetricCard } from '../../components/common/MetricCard'
import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/feedback/LoadingState'
import { AnalyticsColumnChart } from '../../components/manager/AnalyticsColumnChart'
import { AnalyticsLineChart } from '../../components/manager/AnalyticsLineChart'
import { EquipmentPerformanceTable } from '../../components/manager/EquipmentPerformanceTable'
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
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load pass-rate data.')
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Management visibility" title="Compliance" description="Inspection performance and compliance visibility across the fleet." />
      {!analytics && !error ? <LoadingState label="Loading pass-rate visibility…" /> : null}
      {error ? <Card><EmptyState icon={ClipboardCheck} title="Unable to load pass rate" description={error} /></Card> : null}
      {analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Inspection Pass Rate" value={`${analytics.complianceRate}%`} icon={ClipboardCheck} helpText="Passed inspections ÷ completed inspections" reserveLabelSpace />
            <MetricCard label="Completed Inspections" value={analytics.inspectionCount} icon={ChartNoAxesCombined} reserveLabelSpace />
            <MetricCard label="Passed" value={analytics.passedCount} icon={CheckCircle2} reserveLabelSpace />
            <MetricCard label="Failed" value={analytics.failedCount} icon={XCircle} reserveLabelSpace />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
            <Card className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Pass Rate Trend</h2>
              <p className="mt-1 text-sm text-slate-500">Monthly performance across the seeded historical period.</p>
              {analytics.trend.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title="No pass-rate history" description="No completed inspections are available for pass-rate calculation." />
              ) : (
                <div className="mt-5">
                  <AnalyticsLineChart
                    ariaLabel="Inspection pass rate trend"
                    maximum={100}
                    suffix="%"
                    data={analytics.trend.map((period) => ({
                      key: period.key,
                      label: period.label,
                      value: period.complianceRate,
                      detail: `${period.passedCount} passed, ${period.failedCount} failed, ${period.inspectionCount} completed`,
                      tooltipLines: [
                        period.label,
                        `${period.complianceRate}% pass rate`,
                        `${period.passedCount} of ${period.inspectionCount} inspections passed`,
                      ],
                    }))}
                  />
                </div>
              )}
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Inspection Volume</h2>
              <p className="mt-1 text-sm text-slate-500">Completed inspections by month.</p>
              {analytics.trend.length === 0 ? (
                <EmptyState icon={ChartNoAxesCombined} title="No inspection volume" description="Inspection volume will appear after completed inspections are submitted." />
              ) : (
                <div className="mt-5">
                  <AnalyticsColumnChart
                    ariaLabel="Completed inspection volume by month"
                    data={analytics.trend.map((period) => ({
                      key: period.key,
                      label: period.label,
                      value: period.inspectionCount,
                      tooltipLines: [
                        period.label,
                        `${period.inspectionCount} completed ${period.inspectionCount === 1 ? 'inspection' : 'inspections'}`,
                      ],
                    }))}
                  />
                </div>
              )}
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950">Pass Rate by Equipment Type</h2>
              <p className="mt-1 text-sm text-slate-500">Performance calculated from completed inspections associated with each fleet type.</p>
            </div>
            {analytics.inspectionCount === 0 ? (
              <EmptyState icon={ClipboardCheck} title="No equipment-type pass rate" description="No completed inspection data is available for an equipment-type breakdown." />
            ) : (
              <EquipmentPerformanceTable items={analytics.byEquipmentType} />
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}
