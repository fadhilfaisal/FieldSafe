import { AlertTriangle, ArrowLeft, ClipboardCheck, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { useConnectivity } from '../../connectivity/useConnectivity'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/feedback/LoadingState'
import { useToast } from '../../components/feedback/useToast'
import { SignaturePad } from '../../components/inspection/SignaturePad'
import { ReadOnlyInspectionResponseRow } from '../../components/inspection/ReadOnlyInspectionResponseRow'
import type { EquipmentStatus, SignatureData } from '../../domain/models'
import {
  inspectionService,
  validateInspectionDraft,
  type InspectionWorkspace,
} from '../../services/inspectionService'

interface ReviewState {
  workspace: InspectionWorkspace
  resultingEquipmentStatus: EquipmentStatus
}

export function InspectionReviewPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { connectivity } = useConnectivity()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [state, setState] = useState<ReviewState | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signatureError, setSignatureError] = useState('')

  async function load(silent = false) {
    if (!id || !user) return
    if (!silent) setLoading(true)
    try {
      setState(await inspectionService.getReviewSummary(id, user.id))
      setLoadError('')
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load inspection review.'
      if (silent) setMutationError(message)
      else setLoadError(message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // The route identity is the review resource boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id])

  async function saveSignature(signature: SignatureData | null) {
    if (!id || !user) return
    try {
      await inspectionService.saveSignature(id, user.id, signature)
      setSignatureError('')
      setMutationError('')
      await load(true)
    } catch (saveError) {
      setMutationError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save the Inspector signature.',
      )
    }
  }

  async function submit() {
    if (!id || !user || !state) return
    const validation = validateInspectionDraft(
      state.workspace.items,
      state.workspace.draft,
      true,
    )
    if (!validation.isSubmittable) {
      setSignatureError(validation.signatureError ?? 'Checklist details are incomplete.')
      return
    }

    setSubmitting(true)
    setMutationError('')
    try {
      const submission = await inspectionService.submitInspection(
        id,
        user.id,
        connectivity,
      )
      showToast({
        message:
          submission.inspection.syncStatus === 'PENDING_SYNC'
            ? 'Inspection saved offline — waiting to sync.'
            : 'Inspection submitted successfully.',
        tone:
          submission.inspection.syncStatus === 'PENDING_SYNC'
            ? 'warning'
            : 'success',
      })
      navigate(`/inspector/inspection/${id}/result`, { replace: true })
    } catch (submitError) {
      setMutationError(
        submitError instanceof Error
          ? submitError.message
          : 'Inspection submission failed. Try again.',
      )
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Preparing inspection review…" />
  if (loadError || !state) {
    return (
      <Card>
        <EmptyState icon={ClipboardCheck} title="Review unavailable" description={loadError || 'Inspection not found.'} />
      </Card>
    )
  }

  const { workspace, resultingEquipmentStatus } = state
  if (workspace.inspection.status === 'Completed') {
    return (
      <Navigate
        to={`/inspector/inspection/${workspace.inspection.id}/result`}
        replace
      />
    )
  }
  const checklistValidation = validateInspectionDraft(
    workspace.items,
    workspace.draft,
  )
  if (!checklistValidation.isChecklistComplete) {
    return (
      <Card>
        <EmptyState
          icon={ClipboardCheck}
          title="Review not ready"
          description="Complete every checklist item and provide all required defect details before reviewing this inspection."
          action={(
            <Button onClick={() => navigate(`/inspector/inspection/${workspace.inspection.id}`)}>
              Return to Checklist
            </Button>
          )}
        />
      </Card>
    )
  }
  const draftResponses = workspace.draft?.responses ?? []
  const passed = draftResponses.filter((response) => response.result === 'Pass')
  const failed = draftResponses.filter((response) => response.result === 'Fail')
  const criticalCount = failed.filter(
    (response) => response.defect?.severity === 'Critical',
  ).length
  const majorCount = failed.filter(
    (response) => response.defect?.severity === 'Major',
  ).length

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button
        type="button"
        onClick={() => navigate(`/inspector/inspection/${id}`)}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-bold text-brand-700 hover:text-brand-600"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to checklist
      </button>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{workspace.equipment.assetCode} · {workspace.equipment.name}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Review & Sign</h1>
        <p className="mt-2 text-sm text-slate-600">Confirm all responses before submitting this inspection.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-950">{workspace.items.length}</p>
          <p className="mt-1 text-xs text-slate-500">Checklist Items</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-success-700">{passed.length}</p>
          <p className="mt-1 text-xs text-slate-500">Passed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-danger-700">{failed.length}</p>
          <p className="mt-1 text-xs text-slate-500">Failed</p>
        </Card>
      </div>

      {failed.length > 0 ? (
        <div
          className={resultingEquipmentStatus === 'Out of Service'
            ? 'rounded-xl border border-danger-100 bg-danger-50 p-4 text-danger-700'
            : resultingEquipmentStatus === 'Restricted'
              ? 'rounded-xl border border-warning-100 bg-warning-50 p-4 text-warning-800'
              : 'rounded-xl border border-brand-100 bg-brand-50 p-4 text-brand-800'}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div className="text-sm font-bold leading-6">
              <p>Inspection will be submitted as Failed.</p>
              {criticalCount > 0 ? <p>{criticalCount} Critical defect{criticalCount === 1 ? '' : 's'} detected.</p> : null}
              {criticalCount === 0 && majorCount > 0 ? <p>{majorCount} Major defect{majorCount === 1 ? '' : 's'} detected.</p> : null}
              <p>
                Equipment will be {resultingEquipmentStatus === 'Out of Service'
                  ? 'Out of Service.'
                  : resultingEquipmentStatus === 'Restricted'
                    ? 'Restricted.'
                    : 'Fit; unresolved Minor defects do not by themselves restrict equipment.'}
              </p>
            </div>
          </div>
          <div className="mt-3"><StatusBadge status={resultingEquipmentStatus} /></div>
        </div>
      ) : (
        <div className="rounded-xl border border-success-100 bg-success-50 p-4 text-sm font-bold text-success-700" role="status">
          Inspection will be submitted as Passed. Equipment state after submission: {resultingEquipmentStatus}.
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-950">Checklist summary</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {workspace.items.map((item) => {
            const response = draftResponses.find((candidate) => candidate.checklistItemId === item.id)!
            return (
              <ReadOnlyInspectionResponseRow
                key={item.id}
                item={item}
                result={response.result}
                defect={response.defect}
              />
            )
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-bold text-slate-950">Inspector signature</h2>
        <p className="mt-1 text-sm text-slate-600">Draw your signature to confirm this inspection record.</p>
        <div className="mt-4">
          <SignaturePad value={workspace.draft?.signature ?? null} onChange={(signature) => void saveSignature(signature)} />
        </div>
        {signatureError ? <p className="mt-3 text-sm font-semibold text-danger-700" role="alert">{signatureError}</p> : null}
      </Card>

      {mutationError ? (
        <p className="rounded-xl border border-danger-100 bg-danger-50 p-4 text-sm font-semibold text-danger-700" role="alert">
          {mutationError}
        </p>
      ) : null}

      <Button variant="primary" size="lg" className="w-full" onClick={() => void submit()} disabled={submitting}>
        <Send aria-hidden="true" className="size-5" />
        {submitting ? 'Submitting inspection…' : 'Submit Inspection'}
      </Button>
    </div>
  )
}
