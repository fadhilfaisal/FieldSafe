import { ArrowLeft, ClipboardCheck, ShieldCheck, Truck, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { SeverityBadge } from '../../components/common/SeverityBadge'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/feedback/LoadingState'
import { EvidencePreview } from '../../components/inspection/EvidencePreview'
import {
  managerService,
  type ManagerEquipmentDetail,
} from '../../services/managerService'
import { formatDate, formatDateTime } from '../../utils/format'

export function ManagerEquipmentDetailPage() {
  const { id } = useParams()
  const [detail, setDetail] = useState<ManagerEquipmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!id) {
      setError('Equipment not found.')
      setLoading(false)
      return () => {
        active = false
      }
    }
    void managerService
      .getEquipmentDetail(id)
      .then((nextDetail) => {
        if (active) setDetail(nextDetail)
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load equipment detail.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <LoadingState label="Loading equipment detail…" />
  if (error || !detail) return <Card><EmptyState icon={Truck} title="Equipment not found" description={error || 'The requested equipment record is unavailable.'} /></Card>

  return (
    <div className="space-y-6">
      <Link to="/manager/equipment" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-600"><ArrowLeft aria-hidden="true" className="size-4" />Back to equipment</Link>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <PageHeader eyebrow={`${detail.equipment.assetCode} · ${detail.equipment.type}`} title={detail.equipment.name} description={`${detail.equipment.manufacturer} ${detail.equipment.model} · ${detail.equipment.site}`} />
        <StatusBadge status={detail.status} className="self-start" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5"><p className="text-sm font-medium text-slate-600">Current State</p><div className="mt-3"><StatusBadge status={detail.status} /></div></Card>
        <Card className="p-5"><p className="text-sm font-medium text-slate-600">Unresolved Defects</p><p className="mt-2 text-3xl font-bold text-slate-950">{detail.unresolvedDefects.length}</p></Card>
        <Card className="p-5"><p className="text-sm font-medium text-slate-600">Active Actions</p><p className="mt-2 text-3xl font-bold text-slate-950">{detail.activeCorrectiveActionCount}</p></Card>
        <Card className="p-5"><p className="text-sm font-medium text-slate-600">Last Inspection</p><p className="mt-2 text-sm font-bold text-slate-950">{formatDateTime(detail.latestInspection?.submittedAt ?? detail.latestInspection?.completedAt ?? null)}</p></Card>
      </div>

      <section aria-labelledby="equipment-open-defects" className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Current risk</p>
          <h2 id="equipment-open-defects" className="mt-1 text-xl font-bold text-slate-950">Unresolved Defects</h2>
        </div>
        {detail.defectContexts.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {detail.defectContexts.map(({ defect, category, inspection, correctiveActions }) => (
              <Card key={defect.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">{category}</p><h3 className="mt-1 font-bold text-slate-950">{defect.title}</h3></div>
                  <SeverityBadge severity={defect.severity} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{defect.description}</p>
                <p className="mt-3 text-xs text-slate-500">Reported {formatDateTime(defect.reportedAt)} · {defect.status} · Inspection {inspection.id}</p>
                {defect.evidenceReference ? <EvidencePreview evidence={defect.evidenceReference} alt={`Evidence for ${category}`} className="mt-4 h-32 w-full rounded-lg object-cover" /> : null}
                <p className="mt-4 text-xs font-semibold text-slate-600">{correctiveActions.length > 0 ? `${correctiveActions.length} related corrective action` : 'No corrective action recorded'}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Card><EmptyState icon={ShieldCheck} title="No unresolved defects" description="This equipment has no open or under-review defect records." /></Card>
        )}
      </section>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">Recent Inspection History</h2>
          <p className="mt-1 text-sm text-slate-500">Most recent completed inspections for this equipment.</p>
        </div>
        {detail.inspectionHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50"><tr className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500"><th className="px-4 py-3" scope="col">Inspection</th><th className="px-4 py-3" scope="col">Checklist</th><th className="px-4 py-3" scope="col">Inspector</th><th className="px-4 py-3" scope="col">Submitted</th><th className="px-4 py-3" scope="col">Result</th><th className="px-4 py-3" scope="col">Defects</th><th className="px-4 py-3" scope="col">Review</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {detail.inspectionHistory.slice(0, 8).map((item) => (
                  <tr key={item.inspection.id} className="text-sm text-slate-600"><td className="px-4 py-4 font-bold text-brand-800">{item.inspection.id}</td><td className="px-4 py-4">{item.checklist.name}</td><td className="px-4 py-4">{item.inspector.name}</td><td className="whitespace-nowrap px-4 py-4 text-xs">{formatDateTime(item.inspection.submittedAt ?? item.inspection.completedAt)}</td><td className="px-4 py-4">{item.inspection.result ? <StatusBadge status={item.inspection.result} /> : 'Not available'}</td><td className="px-4 py-4 font-bold text-slate-900">{item.defects.length}</td><td className="px-4 py-4">{item.inspection.reviewStatus ?? 'Not reviewed'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={ClipboardCheck} title="No inspection history" description="No completed inspections are associated with this equipment." />
        )}
      </Card>

      <section aria-labelledby="equipment-actions" className="space-y-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Remediation context</p><h2 id="equipment-actions" className="mt-1 text-xl font-bold text-slate-950">Corrective Actions</h2></div>
        {detail.correctiveActionContexts.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {detail.correctiveActionContexts.slice(0, 6).map(({ action, defect, owner }) => (
              <Card key={action.id} className="p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-700">{action.id}</p><h3 className="mt-1 font-bold text-slate-950">{action.title}</h3></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{action.status}</span></div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{action.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500"><span>Owner: <strong className="text-slate-700">{owner.name}</strong></span><span>Due: <strong className="text-slate-700">{formatDate(action.dueAt)}</strong></span><SeverityBadge severity={defect.severity} /></div>
              </Card>
            ))}
          </div>
        ) : (
          <Card><EmptyState icon={Wrench} title="No corrective actions" description="No corrective actions are associated with this equipment." /></Card>
        )}
      </section>
    </div>
  )
}
