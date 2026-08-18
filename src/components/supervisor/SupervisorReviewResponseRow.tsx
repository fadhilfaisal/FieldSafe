import { AlertTriangle, Check, CheckCircle2, X } from 'lucide-react'
import { Link } from 'react-router'
import type {
  CorrectiveAction,
  User,
} from '../../domain/models'
import type { SupervisorReviewResponse } from '../../services/supervisorService'
import { formatDateTime } from '../../utils/format'
import { SeverityBadge } from '../common/SeverityBadge'
import { EvidencePreview } from '../inspection/EvidencePreview'
import { CorrectiveActionForm } from './CorrectiveActionForm'
import { ActionStatusBadge, DefectStatusBadge } from './WorkflowBadges'

interface SupervisorReviewResponseRowProps {
  reviewId: string
  entry: SupervisorReviewResponse
  action: CorrectiveAction | undefined
  technicians: User[]
  submitting: boolean
  error: string
  onCreateAction(input: {
    description: string
    assignedToUserId: string
    dueDate: string
  }): void
}

export function SupervisorReviewResponseRow({
  reviewId,
  entry: { item, response, defect },
  action,
  technicians,
  submitting,
  error,
  onCreateAction,
}: SupervisorReviewResponseRowProps) {
  if (response.result !== 'Fail') {
    return (
      <div
        className="flex items-start justify-between gap-4 bg-slate-25/50 px-5 py-2.5"
        data-response-result={response.result}
        data-response-sequence={item.sequence}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700">
            {item.sequence}. {item.category}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {item.prompt}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-success-700">
          <Check aria-hidden="true" className="size-4" />
          {response.result}
        </span>
      </div>
    )
  }

  return (
    <article
      className="border-l-4 border-danger-600 bg-white"
      data-response-result="Fail"
      data-response-sequence={item.sequence}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 bg-danger-50/60 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-danger-700">
            Failed checklist response
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-950">
            {item.sequence}. {item.category}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {item.prompt}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-danger-700">
            <X aria-hidden="true" className="size-4" />
            Fail
          </span>
          {defect ? <SeverityBadge severity={defect.severity} /> : null}
        </div>
      </div>

      {!defect ? (
        <div className="flex items-start gap-3 px-5 py-4 text-sm text-danger-700">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">Defect details unavailable</p>
            <p className="mt-1 leading-6">
              The related defect record could not be resolved. No corrective
              action can be created from this response.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-5 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Inspector observation
              </p>
              <p className="mt-1.5 text-sm leading-6 text-slate-700">
                {defect.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <DefectStatusBadge status={defect.status} />
                <span>Reported {formatDateTime(defect.reportedAt)}</span>
              </div>
            </div>
            {defect.evidenceReference ? (
              <EvidencePreview
                evidence={defect.evidenceReference}
                alt={`Evidence for ${item.category}`}
                className="h-28 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-28 items-center justify-center rounded-lg bg-slate-100 px-3 text-center text-xs font-semibold text-slate-500">
                No evidence attached
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
            {defect.status === 'Resolved' ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3 text-success-700">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-bold">Defect remediation verified</p>
                    <p className="mt-1 text-xs leading-5">
                      Resolved {formatDateTime(defect.resolvedAt)}. No new
                      corrective action is required.
                    </p>
                  </div>
                </div>
                {action ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionStatusBadge status={action.status} />
                    <Link
                      to={`/supervisor/actions/${action.id}`}
                      state={{ fromReview: `/supervisor/reviews/${reviewId}` }}
                      className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50"
                    >
                      View action
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : action ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      Corrective action
                    </p>
                    <ActionStatusBadge status={action.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{action.title}</p>
                </div>
                <Link
                  to={`/supervisor/actions/${action.id}`}
                  state={{ fromReview: `/supervisor/reviews/${reviewId}` }}
                  className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  View action
                </Link>
              </div>
            ) : (
              <div>
                <h4 className="text-base font-bold text-slate-950">
                  Create Corrective Action
                </h4>
                <p className="mb-4 mt-1 text-sm text-slate-600">
                  Assign corrective work without changing the unresolved defect
                  or equipment safety state.
                </p>
                <CorrectiveActionForm
                  idPrefix={defect.id}
                  technicians={technicians}
                  submitting={submitting}
                  error={error}
                  onSubmit={onCreateAction}
                />
              </div>
            )}
          </div>
        </>
      )}
    </article>
  )
}
