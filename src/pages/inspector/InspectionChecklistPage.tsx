import { AlertCircle, ArrowRight, ClipboardList } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { ChecklistItemCard } from '../../components/inspection/ChecklistItemCard'
import { InspectionProgress } from '../../components/inspection/InspectionProgress'
import { StickyInspectionContext } from '../../components/inspection/StickyInspectionContext'
import type { DraftChecklistResponse, DraftDefect } from '../../domain/models'
import { useInspectionWorkspace } from '../../hooks/useInspectionWorkspace'
import {
  countCompletedResponses,
  inspectionService,
  validateInspectionDraft,
} from '../../services/inspectionService'

export function InspectionChecklistPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { workspace, loading, error, reload } = useInspectionWorkspace(id, user?.id)
  const [showValidation, setShowValidation] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const summaryRef = useRef<HTMLDivElement>(null)

  const validation = useMemo(
    () => validateInspectionDraft(workspace?.items ?? [], workspace?.draft ?? null),
    [workspace],
  )
  const completed = useMemo(
    () => countCompletedResponses(workspace?.items ?? [], workspace?.draft ?? null),
    [workspace],
  )

  async function recordResult(
    itemId: string,
    result: DraftChecklistResponse['result'],
  ) {
    if (!id || !user) return
    try {
      await inspectionService.recordResponse(id, user.id, itemId, result)
      setMutationError('')
      await reload(true)
    } catch (responseError) {
      setMutationError(responseError instanceof Error ? responseError.message : 'Unable to save response.')
    }
  }

  async function updateDefect(itemId: string, patch: Partial<DraftDefect>) {
    if (!id || !user) return
    try {
      await inspectionService.updateDraftDefect(id, user.id, itemId, patch)
      setMutationError('')
      await reload(true)
    } catch (defectError) {
      setMutationError(defectError instanceof Error ? defectError.message : 'Unable to save defect details.')
    }
  }

  function review() {
    if (!validation.isChecklistComplete) {
      setShowValidation(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    navigate(`/inspector/inspection/${id}/review`)
  }

  if (loading) return <LoadingState label="Loading equipment checklist…" />
  if (error || !workspace) {
    return (
      <Card>
        <EmptyState icon={ClipboardList} title="Inspection unavailable" description={error || 'Inspection not found.'} />
      </Card>
    )
  }

  if (workspace.inspection.status === 'Completed') {
    navigate(`/inspector/inspection/${workspace.inspection.id}/result`, { replace: true })
    return null
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-4" data-testid="checklist-safe-area">
      <div ref={summaryRef} data-testid="inspection-main-summary">
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{workspace.equipment.assetCode} · {workspace.equipment.name}</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{workspace.checklist.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{workspace.equipment.site}</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">In Progress</span>
          </div>
          <div className="mt-5">
            <InspectionProgress completed={completed} total={workspace.items.length} />
          </div>
        </Card>
      </div>

      <StickyInspectionContext
        summaryRef={summaryRef}
        assetCode={workspace.equipment.assetCode}
        equipmentName={workspace.equipment.name}
        checklistName={workspace.checklist.name}
        completed={completed}
        total={workspace.items.length}
      />

      {showValidation && !validation.isChecklistComplete ? (
        <div className="flex items-start gap-3 rounded-xl border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700" role="alert">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">Checklist incomplete</p>
            <p className="mt-1 leading-5">Answer every item. Failed items also require a meaningful description, severity, and photo evidence.</p>
          </div>
        </div>
      ) : null}

      {mutationError ? (
        <p className="rounded-lg bg-danger-50 p-3 text-sm font-semibold text-danger-700" role="alert">{mutationError}</p>
      ) : null}

      <div className="space-y-4" data-testid="checklist-items">
        {workspace.items.map((item) => {
          const response = workspace.draft?.responses.find(
            (candidate) => candidate.checklistItemId === item.id,
          )
          return (
            <ChecklistItemCard
              key={item.id}
              item={item}
              response={response}
              errors={showValidation ? validation.itemErrors[item.id] : undefined}
              onResult={(result) => void recordResult(item.id, result)}
              onDefectChange={(patch) => void updateDefect(item.id, patch)}
            />
          )
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card" data-testid="checklist-review-cta">
        <Button size="lg" className="w-full" onClick={review}>
          Review Inspection
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
        {!validation.isChecklistComplete ? (
          <p className="mt-2 text-center text-xs font-medium text-slate-500">
            {workspace.items.length - completed} item{workspace.items.length - completed === 1 ? '' : 's'} still require attention.
          </p>
        ) : null}
      </div>
    </div>
  )
}
