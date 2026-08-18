import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  PenLine,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/feedback/LoadingState'
import { SupervisorReviewResponseRow } from '../../components/supervisor/SupervisorReviewResponseRow'
import { ReviewRejectionDialog } from '../../components/supervisor/ReviewRejectionDialog'
import { ReviewStatusBadge } from '../../components/supervisor/WorkflowBadges'
import type { User } from '../../domain/models'
import {
  SupervisorReviewConfirmationRequired,
  supervisorService,
  type SupervisorReviewDetail,
} from '../../services/supervisorService'
import { formatDateTime } from '../../utils/format'

export function SupervisorReviewDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [review, setReview] = useState<SupervisorReviewDetail | null>(null)
  const [technicians, setTechnicians] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [creatingFor, setCreatingFor] = useState('')
  const [marking, setMarking] = useState(false)
  const [confirmingReview, setConfirmingReview] = useState(false)
  const [confirmationCount, setConfirmationCount] = useState(0)
  const [notice, setNotice] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionError, setRejectionError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [nextReview, nextTechnicians] = await Promise.all([
        supervisorService.getReviewDetail(id),
        supervisorService.getTechnicians(),
      ])
      setReview(nextReview)
      setTechnicians(nextTechnicians)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load inspection review.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function markReviewed(acknowledgeUnassignedDefects = false) {
    if (!id || !user) return
    setMarking(true)
    setMutationError('')
    try {
      await supervisorService.markReviewReviewed(
        id,
        user.id,
        acknowledgeUnassignedDefects,
      )
      setNotice('Inspection approved.')
      setConfirmingReview(false)
      await load()
    } catch (markError) {
      if (markError instanceof SupervisorReviewConfirmationRequired) {
        setConfirmationCount(markError.unassignedDefectCount)
        setConfirmingReview(true)
        return
      }
      setMutationError(markError instanceof Error ? markError.message : 'Unable to update review status.')
    } finally {
      setMarking(false)
    }
  }

  async function rejectReview() {
    if (!id || !user) return
    setRejecting(true)
    setRejectionError('')
    try {
      await supervisorService.rejectInspectionReview(
        id,
        user.id,
        rejectionReason,
      )
      setRejectDialogOpen(false)
      navigate('/supervisor/reviews', { replace: true })
    } catch (rejectError) {
      setRejectionError(
        rejectError instanceof Error
          ? rejectError.message
          : 'Unable to reject this inspection.',
      )
    } finally {
      setRejecting(false)
    }
  }

  function requestMarkReviewed() {
    if (review?.unassignedUnresolvedDefectCount) {
      setConfirmationCount(review.unassignedUnresolvedDefectCount)
      setConfirmingReview(true)
      return
    }
    void markReviewed()
  }

  async function createAction(
    defectId: string,
    input: {
      description: string
      assignedToUserId: string
      dueDate: string
    },
  ) {
    if (!user) return
    setCreatingFor(defectId)
    setMutationError('')
    try {
      await supervisorService.createCorrectiveAction({
        defectId,
        supervisorId: user.id,
        ...input,
      })
      setNotice('Corrective action created successfully.')
      await load()
    } catch (createError) {
      setMutationError(createError instanceof Error ? createError.message : 'Unable to create corrective action.')
    } finally {
      setCreatingFor('')
    }
  }

  if (loading) return <LoadingState label="Loading inspection review…" />
  if (error || !review) {
    return <Card><EmptyState icon={ClipboardCheck} title="Review not found" description={error || 'This submitted inspection could not be resolved.'} /></Card>
  }

  const passed = review.responses.filter((item) => item.response.result === 'Pass')
  const failed = review.responses.filter((item) => item.response.result === 'Fail')
  const cleanPass =
    review.inspection.result === 'Pass' &&
    failed.length === 0 &&
    review.defects.length === 0
  const signed = Boolean(
    review.inspection.signature?.strokes.some((stroke) => stroke.length >= 2),
  )

  return (
    <div className="space-y-6">
      <Link to={cleanPass ? '/supervisor' : '/supervisor/reviews'} className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-600">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {cleanPass ? 'Back to Supervisor Overview' : 'Back to reviews'}
      </Link>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <PageHeader
          eyebrow={`${review.equipment.assetCode} · ${review.equipment.type}`}
          title={cleanPass ? 'Completed Inspection' : 'Inspection Review'}
          description={`${review.equipment.name} · ${review.equipment.site}`}
        />
        <div className="flex flex-wrap items-center gap-2">
          {cleanPass ? (
            <StatusBadge status="Completed" />
          ) : (
            <ReviewStatusBadge status={review.inspection.reviewStatus ?? 'Pending Review'} />
          )}
          {review.inspection.result ? (
            <StatusBadge status={review.inspection.result} />
          ) : (
            <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-warning-100 bg-warning-50 px-2.5 py-1 text-xs font-bold text-warning-800">
              <AlertTriangle aria-hidden="true" className="size-3.5" />
              Result unavailable
            </span>
          )}
          <StatusBadge status={review.equipment.status} />
        </div>
      </div>

      {notice ? (
        <div className="flex items-center gap-2 rounded-xl border border-success-100 bg-success-50 p-4 text-sm font-semibold text-success-700" role="status">
          <CheckCircle2 aria-hidden="true" className="size-5" />
          {notice}
        </div>
      ) : null}
      {mutationError ? <p className="rounded-xl bg-danger-50 p-4 text-sm font-semibold text-danger-700" role="alert">{mutationError}</p> : null}

      <Card className="p-5">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-xs font-semibold text-slate-500">Inspector</p><p className="mt-1 text-sm font-bold text-slate-900">{review.inspector.name}</p></div>
          <div><p className="text-xs font-semibold text-slate-500">Checklist</p><p className="mt-1 text-sm font-bold text-slate-900">{review.checklist.name}</p></div>
          <div><p className="text-xs font-semibold text-slate-500">Submitted</p><p className="mt-1 text-sm font-bold text-slate-900">{formatDateTime(review.inspection.submittedAt)}</p></div>
          <div><p className="text-xs font-semibold text-slate-500">Signature</p><p className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-slate-900"><PenLine aria-hidden="true" className="size-4 text-brand-700" />{signed ? 'Inspector signed' : 'Legacy record — not captured'}</p></div>
        </div>
        {cleanPass ? (
          <p className="mt-5 text-xs font-semibold text-success-700">
            Completed with all checklist responses passing. No Supervisor acknowledgement is required.
          </p>
        ) : review.inspection.reviewStatus === 'Pending Review' ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={requestMarkReviewed} disabled={marking || rejecting}>
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {marking ? 'Approving…' : 'Approve Inspection'}
            </Button>
            <Button variant="danger" onClick={() => setRejectDialogOpen(true)} disabled={marking || rejecting}>
              Reject
            </Button>
          </div>
        ) : review.inspection.reviewStatus === 'Reviewed' ? (
          <p className="mt-5 text-xs font-semibold text-success-700">Reviewed {formatDateTime(review.inspection.reviewedAt)}</p>
        ) : null}
      </Card>

      {review.latestRejection ? (
        <Card className="border-warning-200 bg-warning-50 p-4">
          <p className="text-sm font-bold text-warning-900">Previously rejected</p>
          <p className="mt-1 text-sm text-warning-900">{review.latestRejection.reason}</p>
          <p className="mt-2 text-xs font-semibold text-warning-800">
            Rejected by {review.latestRejection.supervisor?.name ?? 'Supervisor'} · {formatDateTime(review.latestRejection.rejectedAt)}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 text-center"><p className="text-3xl font-bold text-slate-950">{review.responses.length}</p><p className="mt-1 text-sm text-slate-500">Checklist Items</p></Card>
        <Card className="p-5 text-center"><p className="text-3xl font-bold text-success-700">{passed.length}</p><p className="mt-1 text-sm text-slate-500">Passed</p></Card>
        <Card className="p-5 text-center"><p className="text-3xl font-bold text-danger-700">{failed.length}</p><p className="mt-1 text-sm text-slate-500">Failed</p></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="font-bold text-slate-950">Checklist responses</h2>
          {!cleanPass ? (
            <p className="mt-1 text-xs text-slate-500">
              Failed responses include the Inspector observation, evidence, and remediation state.
            </p>
          ) : null}
        </div>
        <div className="divide-y divide-slate-100">
          {review.responses.map((entry) => {
            const defectId = entry.defect?.id
            const existingAction = defectId
              ? review.actions.find((action) => action.defectId === defectId)
              : undefined
            return (
              <SupervisorReviewResponseRow
                key={entry.response.id}
                reviewId={review.inspection.id}
                entry={entry}
                action={existingAction}
                technicians={technicians}
                submitting={creatingFor === defectId}
                error={creatingFor === defectId ? mutationError : ''}
                onCreateAction={(input) => {
                  if (defectId) void createAction(defectId, input)
                }}
              />
            )
          })}
        </div>
      </Card>

      {!cleanPass ? <ConfirmationDialog
        open={confirmingReview}
        title="Approve inspection?"
        description={`${confirmationCount} unresolved defect${confirmationCount === 1 ? '' : 's'} ${confirmationCount === 1 ? 'has' : 'have'} no corrective action assigned. Mark this inspection as reviewed anyway?`}
        confirmLabel="Approve Anyway"
        busyLabel="Approving…"
        busy={marking}
        onCancel={() => setConfirmingReview(false)}
        onConfirm={() => void markReviewed(true)}
      /> : null}
      <ReviewRejectionDialog
        open={rejectDialogOpen}
        reason={rejectionReason}
        busy={rejecting}
        error={rejectionError}
        onReasonChange={setRejectionReason}
        onCancel={() => {
          setRejectDialogOpen(false)
          setRejectionError('')
        }}
        onConfirm={() => void rejectReview()}
      />
    </div>
  )
}
