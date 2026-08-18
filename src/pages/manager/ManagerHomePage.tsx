import {
  Activity,
  ArrowRight,
  ChartNoAxesCombined,
  ClipboardCheck,
  ShieldAlert,
  Truck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { MetricCard } from '../../components/common/MetricCard'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/feedback/LoadingState'
import {
  managerService,
  type ManagerOverview,
} from '../../services/managerService'

const managerDestinations = [
  {
    title: 'Compliance',
    description: 'Inspection pass performance and compliance visibility by equipment type.',
    to: '/manager/compliance',
    icon: ClipboardCheck,
  },
  {
    title: 'Defects',
    description: 'Severity, unresolved risk, volume trends, and common categories.',
    to: '/manager/defects',
    icon: ShieldAlert,
  },
  {
    title: 'Equipment',
    description: 'Current fleet safety state with inspection and defect context.',
    to: '/manager/equipment',
    icon: Truck,
  },
]

export function ManagerHomePage() {
  const [overview, setOverview] = useState<ManagerOverview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void managerService
      .getOverview()
      .then((nextOverview) => {
        if (active) setOverview(nextOverview)
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load Manager visibility.',
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
        eyebrow="Management visibility"
        title="Manager Overview"
        description="Read-only visibility into inspection pass rate, defects, and current equipment safety state."
      />

      {!overview && !error ? <LoadingState label="Loading management overview…" /> : null}
      {error ? (
        <Card>
          <EmptyState icon={ChartNoAxesCombined} title="Unable to load overview" description={error} />
        </Card>
      ) : null}

      {overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Inspection Pass Rate" value={`${overview.complianceRate}%`} icon={ClipboardCheck} helpText="Passed inspections ÷ completed inspections" />
            <MetricCard label="Inspections — Last 30 Days" value={overview.recentInspectionCount} icon={Activity} supportingText="Completed in the rolling 30-day period" />
            <MetricCard label="Open Defects" value={overview.openDefectCount} icon={ShieldAlert} supportingText="Open and under-review defects" />
            <MetricCard label="Out of Service" value={overview.equipmentStatusCounts['Out of Service']} icon={Truck} supportingText={`Across ${overview.totalEquipmentCount} equipment records`} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Fleet risk</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">Equipment Requiring Attention</h2>
                </div>
                <Link to="/manager/equipment" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-600">
                  View board <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
              {overview.totalEquipmentCount === 0 ? (
                <EmptyState icon={Truck} title="No equipment data" description="Fleet safety state is unavailable because no equipment records were found." />
              ) : overview.highestRiskEquipment.length > 0 ? (
                <div className="mt-5 divide-y divide-slate-100">
                  {overview.highestRiskEquipment.map((item) => (
                    <Link key={item.equipment.id} to={`/manager/equipment/${item.equipment.id}`} className="flex min-h-16 items-center justify-between gap-4 py-3 hover:bg-slate-50">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-700">{item.equipment.assetCode}</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{item.equipment.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{item.equipment.site} · {item.unresolvedDefects.length} unresolved</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Truck} title="Fleet is fit" description="No equipment is currently restricted or out of service." />
              )}
            </Card>

            <Card className="p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Current fleet state</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Equipment Status</h2>
              <div className="mt-5 space-y-4">
                {(['Fit', 'Restricted', 'Out of Service'] as const).map((status) => (
                  <Link
                    key={status}
                    to={`/manager/equipment?state=${encodeURIComponent(status)}`}
                    aria-label={`View ${status} equipment`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    <StatusBadge status={status} />
                    <span className="text-2xl font-bold text-slate-950">{overview.equipmentStatusCounts[status]}</span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          <section aria-labelledby="manager-visibility-title">
            <h2 id="manager-visibility-title" className="text-xl font-bold text-slate-950">Explore Operational Visibility</h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              {managerDestinations.map(({ title, description, to, icon: Icon }) => (
                <Link key={title} to={to} className="group rounded-card border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon aria-hidden="true" className="size-5" /></span>
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700">Open view <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-0.5" /></span>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
