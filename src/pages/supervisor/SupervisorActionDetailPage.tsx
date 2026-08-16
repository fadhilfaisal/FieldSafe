import { ArrowLeft, CheckCircle2, ShieldAlert, Wrench } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { SeverityBadge } from '../../components/common/SeverityBadge'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/feedback/LoadingState'
import { EvidencePreview } from '../../components/inspection/EvidencePreview'
import { ActionStatusBadge, DefectStatusBadge, OverdueBadge } from '../../components/supervisor/WorkflowBadges'
import type { CorrectiveActionStatus } from '../../domain/models'
import {
  supervisorService,
  type SupervisorActionListItem,
} from '../../services/supervisorService'
import { formatDate, formatDateTime } from '../../utils/format'

const actionStatusHelp: Record<CorrectiveActionStatus, string> = {
  Open: 'Corrective work has not started.',
  'In Progress': 'Corrective work is underway.',
  Done: 'Corrective work is complete; an unresolved originating defect still requires Supervisor verification.',
}

export function SupervisorActionDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [item, setItem] = useState<SupervisorActionListItem | null>(null)
  const [status, setStatus] = useState<CorrectiveActionStatus>('Open')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [confirmingResolution, setConfirmingResolution] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const nextItem = await supervisorService.getActionDetail(id)
      setItem(nextItem)
      setStatus(nextItem.action.status)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load corrective action.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function saveStatus() {
    if (!id) return
    setSaving(true)
    setError('')
    try {
      await supervisorService.updateCorrectiveActionStatus(id, status)
      setNotice(`Corrective action updated to ${status}.`)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update action status.')
    } finally {
      setSaving(false)
    }
  }

  async function verifyAndResolve() {
    if (!id || !user) return
    setResolving(true)
    setError('')
    try {
      const resolution = await supervisorService.verifyAndResolveDefect(
        id,
        user.id,
      )
      setNotice(
        `Defect verified and resolved. Equipment is now ${resolution.equipment.status}.`,
      )
      setConfirmingResolution(false)
      await load()
    } catch (resolutionError) {
      setConfirmingResolution(false)
      setError(
        resolutionError instanceof Error
          ? resolutionError.message
          : 'Unable to verify and resolve this defect.',
      )
    } finally {
      setResolving(false)
    }
  }

  if (loading) return <LoadingState label="Loading corrective action…" />
  if (error && !item) return <Card><EmptyState icon={Wrench} title="Corrective action not found" description={error} /></Card>
  if (!item) return null

  return (
    <div className="space-y-6">
      <Link to="/supervisor/actions" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-600"><ArrowLeft aria-hidden="true" className="size-4" />Back to corrective actions</Link>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <PageHeader eyebrow={`${item.action.id} · ${item.equipment.assetCode}`} title="Corrective Action Detail" description={item.action.title} />
        <div className="flex flex-wrap items-center gap-2"><ActionStatusBadge status={item.action.status} overdue={item.overdue} />{item.overdue ? <OverdueBadge /> : null}<SeverityBadge severity={item.defect.severity} /></div>
      </div>
      {notice ? <div className="flex items-center gap-2 rounded-xl border border-success-100 bg-success-50 p-4 text-sm font-semibold text-success-700" role="status"><CheckCircle2 aria-hidden="true" className="size-5" />{notice}</div> : null}
      {error ? <p className="rounded-xl bg-danger-50 p-4 text-sm font-semibold text-danger-700" role="alert">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-950">Required action</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">{item.action.description}</p>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold text-slate-500">Owner</dt><dd className="mt-1 text-sm font-bold text-slate-900">{item.owner.name}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Due date</dt><dd className="mt-1 text-sm font-bold text-slate-900">{formatDate(item.action.dueAt)}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Created</dt><dd className="mt-1 text-sm font-bold text-slate-900">{formatDateTime(item.action.createdAt)}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Completed</dt><dd className="mt-1 text-sm font-bold text-slate-900">{formatDateTime(item.action.completedAt)}</dd></div>
          </dl>
          <div className="mt-7 border-t border-slate-200 pt-5">
            <label htmlFor="action-status" className="text-sm font-bold text-slate-800">Action status</label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <select id="action-status" value={status} onChange={(event) => setStatus(event.target.value as CorrectiveActionStatus)} className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900">
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
              <Button onClick={() => void saveStatus()} disabled={saving || status === item.action.status}>{saving ? 'Saving…' : 'Update Status'}</Button>
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
              {actionStatusHelp[status]}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Done does not resolve the defect or verify the equipment as safe.</p>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Equipment</h2>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-brand-700">{item.equipment.assetCode}</p>
            <p className="mt-1 font-bold text-slate-900">{item.equipment.name}</p>
            <p className="mt-1 text-sm text-slate-500">{item.equipment.site}</p>
            <div className="mt-4"><StatusBadge status={item.equipment.status} /></div>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Originating defect</h2>
            <p className="mt-3 text-sm font-bold text-slate-900">{item.defect.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.defect.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2"><SeverityBadge severity={item.defect.severity} /><DefectStatusBadge status={item.defect.status} /></div>
            {item.defect.status === 'Resolved' ? (
              <div className="mt-4 rounded-lg border border-success-100 bg-success-50 p-3 text-sm text-success-700">
                <p className="font-bold">Remediation verified</p>
                <p className="mt-1 text-xs leading-5">
                  Resolved {formatDateTime(item.defect.resolvedAt)}
                  {item.resolver ? ` by ${item.resolver.name}` : ''}.
                </p>
              </div>
            ) : item.action.status === 'Done' ? (
              <div className="mt-4 rounded-lg border border-warning-100 bg-warning-50 p-3 text-sm text-warning-800">
                <p className="font-bold">Corrective work complete — verification required</p>
                <p className="mt-1 text-xs leading-5">
                  The originating defect remains unresolved and equipment safety remains defect-driven.
                </p>
                <Button
                  className="mt-3 w-full"
                  onClick={() => setConfirmingResolution(true)}
                >
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  Verify &amp; Resolve Defect
                </Button>
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
                This defect remains unresolved. Complete the corrective action before Supervisor verification.
              </p>
            )}
            {item.defect.evidenceReference ? <EvidencePreview evidence={item.defect.evidenceReference} alt="Originating defect evidence" className="mt-4 h-32 w-full rounded-lg object-cover" /> : null}
            <Link to={`/supervisor/reviews/${item.inspection.id}`} className="mt-4 inline-flex min-h-10 items-center text-sm font-bold text-brand-700 hover:text-brand-600">Open originating inspection</Link>
          </Card>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-warning-100 bg-warning-50 p-4 text-sm text-warning-800">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p><span className="font-bold">Safety state remains defect-driven.</span> Updating this action, including marking it Done, does not resolve the defect or return equipment to service.</p>
      </div>

      <ConfirmationDialog
        open={confirmingResolution}
        title="Verify remediation and resolve defect?"
        description="Confirm that the completed corrective work has been verified and the originating defect is no longer present. Resolving this defect will recalculate the equipment's safety state from all remaining unresolved defects."
        confirmLabel="Verify & Resolve"
        busyLabel="Verifying remediation…"
        busy={resolving}
        onCancel={() => setConfirmingResolution(false)}
        onConfirm={() => void verifyAndResolve()}
      />
    </div>
  )
}
