import { ArrowLeft, ClipboardCheck, PenLine } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/feedback/LoadingState'
import { ReadOnlyInspectionResponseRow } from '../../components/inspection/ReadOnlyInspectionResponseRow'
import { SyncStatusBadge } from '../../components/inspection/SyncStatusBadge'
import {
  inspectionService,
  type InspectionWorkspace,
} from '../../services/inspectionService'
import { formatDateTime } from '../../utils/format'

export function CompletedInspectionDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [workspace, setWorkspace] = useState<InspectionWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id || !user) return
    void inspectionService
      .getCompletedInspectionDetail(id, user.id)
      .then(setWorkspace)
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load completed inspection.',
        ),
      )
      .finally(() => setLoading(false))
  }, [id, user])

  if (loading) return <LoadingState label="Loading completed inspection…" />
  if (error || !workspace) {
    return (
      <Card>
        <EmptyState
          icon={ClipboardCheck}
          title="Completed inspection not found"
          description={error || 'This inspection record could not be resolved.'}
          action={(
            <Link className="text-sm font-bold text-brand-700" to="/inspector/history">
              Return to History
            </Link>
          )}
        />
      </Card>
    )
  }

  const signed = Boolean(
    workspace.inspection.signature?.strokes.some((stroke) => stroke.length >= 2),
  )
  const passed = workspace.responses.filter((response) => response.result === 'Pass')
  const failed = workspace.responses.filter((response) => response.result === 'Fail')

  return (
    <div
      className="mx-auto max-w-3xl space-y-5"
      data-completed-inspection={workspace.inspection.id}
      data-testid="completed-inspection-detail"
    >
      <Link
        to="/inspector/history"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-bold text-brand-700 hover:text-brand-600"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to History
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow={`${workspace.equipment.assetCode} · ${workspace.equipment.type}`}
          title="Completed Inspection"
          description={`${workspace.equipment.name} · ${workspace.equipment.site}`}
        />
        <div className="flex flex-wrap gap-2">
          {workspace.inspection.result ? <StatusBadge status={workspace.inspection.result} /> : null}
          <StatusBadge status={workspace.equipment.status} />
          <SyncStatusBadge status={workspace.inspection.syncStatus} />
        </div>
      </div>

      <Card className="p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">Checklist</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{workspace.checklist.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Submitted</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{formatDateTime(workspace.inspection.submittedAt)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Checklist result</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{passed.length} passed · {failed.length} failed</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Signature</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-slate-900">
              <PenLine aria-hidden="true" className="size-4 text-brand-700" />
              {signed ? 'Inspector signed' : 'Legacy record — not captured'}
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="font-bold text-slate-950">Submitted checklist responses</h2>
          <p className="mt-1 text-xs text-slate-500">
            Read-only record in original checklist order.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {workspace.items.map((item) => {
            const response = workspace.responses.find(
              (candidate) => candidate.checklistItemId === item.id,
            )
            const defect = response
              ? workspace.defects.find(
                  (candidate) => candidate.checklistResponseId === response.id,
                ) ?? null
              : null
            return response?.result === 'Pass' || response?.result === 'Fail' ? (
              <ReadOnlyInspectionResponseRow
                key={item.id}
                item={item}
                result={response.result}
                defect={defect}
              />
            ) : (
              <div key={item.id} className="px-5 py-3 text-sm text-slate-500">
                {item.sequence}. {item.category} · Response unavailable
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
