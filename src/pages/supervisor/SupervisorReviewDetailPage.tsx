import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  PenLine,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { SeverityBadge } from '../../components/common/SeverityBadge'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/feedback/LoadingState'
import { EvidencePreview } from '../../components/inspection/EvidencePreview'
import { CorrectiveActionForm } from '../../components/supervisor/CorrectiveActionForm'
import { ReviewStatusBadge } from '../../components/supervisor/WorkflowBadges'
import type { User } from '../../domain/models'
import {
  supervisorService,
  type SupervisorReviewDetail,
} from '../../services/supervisorService'
import { formatDateTime } from '../../utils/format'

export function SupervisorReviewDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [review, setReview] = useState<SupervisorReviewDetail | null>(null)
  const [technicians, setTechnicians] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [creatingFor, setCreatingFor] = useState('')
  const [marking, setMarking] = useState(false)
  const [notice, setNotice] = useState('')

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

  async function markReviewed() {
    if (!id || !user) return
    setMarking(true)
    setMutationError('')
    try {
      await supervisorService.markReviewReviewed(id, user.id)
      setNotice('Inspection review marked as reviewed.')
      await load()
    } catch (markError) {
      setMutationError(markError instanceof Error ? markError.message : 'Unable to update review status.')
    } finally {
      setMarking(false)
    }
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
  const signed = Boolean(
    review.inspection.signature?.strokes.some((stroke) => stroke.length >= 2),
  )

  return (
    <div className="space-y-6">
      <Link to="/supervisor/reviews" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-600">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to reviews
      </Link>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <PageHeader
          eyebrow={`${review.equipment.assetCode} · ${review.equipment.type}`}
          title="Inspection Review"
          description={`${review.equipment.name} · ${review.equipment.site}`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ReviewStatusBadge status={review.inspection.reviewStatus ?? 'Pending Review'} />
          <StatusBadge status={review.inspection.result ?? 'Pass'} />
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
        {review.inspection.reviewStatus === 'Pending Review' ? (
          <Button className="mt-5" onClick={() => void markReviewed()} disabled={marking}>
            <CheckCircle2 aria-hidden="true" className="size-4" />
            {marking ? 'Marking reviewed…' : 'Mark Review as Reviewed'}
          </Button>
        ) : (
          <p className="mt-5 text-xs font-semibold text-success-700">Reviewed {formatDateTime(review.inspection.reviewedAt)}</p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 text-center"><p className="text-3xl font-bold text-slate-950">{review.responses.length}</p><p className="mt-1 text-sm text-slate-500">Checklist Items</p></Card>
        <Card className="p-5 text-center"><p className="text-3xl font-bold text-success-700">{passed.length}</p><p className="mt-1 text-sm text-slate-500">Passed</p></Card>
        <Card className="p-5 text-center"><p className="text-3xl font-bold text-danger-700">{failed.length}</p><p className="mt-1 text-sm text-slate-500">Failed</p></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4"><h2 className="font-bold text-slate-950">Checklist responses</h2></div>
        <div className="divide-y divide-slate-100">
          {review.responses.map(({ item, response }) => (
            <div key={response.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div><p className="text-sm font-bold text-slate-800">{item.sequence}. {item.category}</p><p className="mt-1 text-xs text-slate-500">{item.prompt}</p></div>
              <span className={response.result === 'Pass' ? 'inline-flex items-center gap-1 text-xs font-bold text-success-700' : 'inline-flex items-center gap-1 text-xs font-bold text-danger-700'}>
                {response.result === 'Pass' ? <Check aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}
                {response.result}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <section aria-labelledby="review-defects-title" className="space-y-4">
        <h2 id="review-defects-title" className="text-xl font-bold text-slate-950">Defect Assessment</h2>
        {failed.length === 0 ? (
          <Card><EmptyState icon={CheckCircle2} title="No defects recorded" description="Every checklist item passed during this inspection." /></Card>
        ) : null}
        {failed.map(({ item, defect }) => {
          if (!defect) return null
          const existingAction = review.actions.find((action) => action.defectId === defect.id)
          return (
            <Card key={defect.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-danger-100 bg-danger-50 px-5 py-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-danger-700">Failed item</p><h3 className="mt-1 font-bold text-slate-950">{item.category}</h3></div>
                <SeverityBadge severity={defect.severity} />
              </div>
              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_14rem]">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.prompt}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{defect.description}</p>
                  <p className="mt-3 text-xs text-slate-500">Reported {formatDateTime(defect.reportedAt)} · Defect status: <span className="font-bold text-slate-700">{defect.status}</span></p>
                </div>
                {defect.evidenceReference ? <EvidencePreview evidence={defect.evidenceReference} alt={`Evidence for ${item.category}`} className="h-36 w-full rounded-lg object-cover" /> : <div className="flex h-36 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500">No evidence attached</div>}
              </div>
              <div className="border-t border-slate-200 bg-slate-50 p-5">
                {existingAction ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-sm font-bold text-slate-900">Corrective action created</p><p className="mt-1 text-xs text-slate-500">{existingAction.title}</p></div>
                    <Link to={`/supervisor/actions/${existingAction.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50">View action</Link>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-base font-bold text-slate-950">Create Corrective Action</h4>
                    <p className="mt-1 mb-4 text-sm text-slate-600">Assign corrective work without changing the unresolved defect or equipment safety state.</p>
                    <CorrectiveActionForm
                      idPrefix={defect.id}
                      technicians={technicians}
                      submitting={creatingFor === defect.id}
                      error={creatingFor === defect.id ? mutationError : ''}
                      onSubmit={(input) => void createAction(defect.id, input)}
                    />
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </section>
    </div>
  )
}
