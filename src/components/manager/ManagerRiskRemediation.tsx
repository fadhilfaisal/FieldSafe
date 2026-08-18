import { CheckCircle2, ShieldCheck, Wrench } from 'lucide-react'
import { isCorrectiveActionOverdue } from '../../domain/safety'
import type {
  ManagerCorrectiveActionContext,
  ManagerEquipmentDetail,
} from '../../services/managerService'
import { formatDate, formatDateTime } from '../../utils/format'
import { Card } from '../common/Card'
import { SeverityBadge } from '../common/SeverityBadge'
import { EvidencePreview } from '../inspection/EvidencePreview'
import {
  ActionStatusBadge,
  DefectStatusBadge,
  OverdueBadge,
} from '../supervisor/WorkflowBadges'

function RemediationAction({
  context,
}: {
  context: ManagerCorrectiveActionContext
}) {
  const { action, owner } = context
  const overdue = isCorrectiveActionOverdue(action)

  return (
    <div
      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
      data-remediation-action-id={action.id}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-700">
            Corrective action · {action.id}
          </p>
          <h4 className="mt-1 font-bold text-slate-950">{action.title}</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionStatusBadge status={action.status} overdue={overdue} />
          {overdue ? <OverdueBadge /> : null}
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {action.description}
      </p>
      <dl className="mt-3 grid gap-x-5 gap-y-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="font-semibold text-slate-500">Owner</dt>
          <dd className="mt-0.5 font-bold text-slate-800">
            {owner?.name ?? 'Owner unavailable'}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Due</dt>
          <dd className="mt-0.5 font-bold text-slate-800">
            {formatDate(action.dueAt)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Completed</dt>
          <dd className="mt-0.5 font-bold text-slate-800">
            {action.completedAt
              ? formatDateTime(action.completedAt)
              : 'Not completed'}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function ManagerRiskRemediation({
  detail,
}: {
  detail: ManagerEquipmentDetail
}) {
  const actionContextById = new Map(
    detail.correctiveActionContexts.map((context) => [
      context.action.id,
      context,
    ]),
  )

  return (
    <section aria-labelledby="current-risk-remediation" className="space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">
          Current safety decision
        </p>
        <h2
          id="current-risk-remediation"
          className="mt-1 text-xl font-bold text-slate-950"
        >
          Current Risk &amp; Remediation
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Unresolved safety defects and the corrective work associated with each
          record.
        </p>
      </div>

      {detail.defectContexts.length === 0 ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-success-100 bg-success-50 p-4 text-success-700"
          data-risk-empty-state="compact"
        >
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold">No unresolved safety defects</h3>
            <p className="mt-0.5 text-xs leading-5">
              No open or under-review safety defect records require remediation.
            </p>
          </div>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-200">
            {detail.defectContexts.map(
              ({ defect, category, inspection, correctiveActions }) => (
                <article
                  key={defect.id}
                  className="p-5 sm:p-6"
                  data-risk-defect-id={defect.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
                        {category}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-slate-950">
                        {defect.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={defect.severity} />
                      <DefectStatusBadge status={defect.status} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_13rem]">
                    <div>
                      <p className="text-sm leading-6 text-slate-700">
                        {defect.description}
                      </p>
                      <p className="mt-3 text-xs text-slate-500">
                        Reported {formatDateTime(defect.reportedAt)} · Originating
                        inspection {inspection?.id ?? 'unavailable'}
                      </p>
                    </div>
                    {defect.evidenceReference ? (
                      <EvidencePreview
                        evidence={defect.evidenceReference}
                        alt={`Evidence for ${category} defect on ${detail.equipment.assetCode}`}
                        className="h-28 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center rounded-lg bg-slate-100 px-3 text-center text-xs font-semibold text-slate-500">
                        No evidence attached
                      </div>
                    )}
                  </div>

                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <h4 className="text-sm font-bold text-slate-900">
                      Remediation
                    </h4>
                    {correctiveActions.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {correctiveActions.map((action) => {
                          const context = actionContextById.get(action.id) ?? {
                            action,
                            defect,
                            owner: null,
                          }
                          return (
                            <RemediationAction key={action.id} context={context} />
                          )
                        })}
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-warning-100 bg-warning-50 p-3 text-sm font-semibold text-warning-800">
                        <Wrench aria-hidden="true" className="size-4 shrink-0" />
                        No corrective action assigned
                      </div>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        </Card>
      )}

      {detail.status === 'Fit' &&
      detail.unresolvedDefects.some((defect) => defect.severity === 'Minor') ? (
        <p className="text-xs font-semibold text-brand-700">
          Fit indicates no unresolved Major or Critical defects; Minor defects
          may remain open.
        </p>
      ) : null}
    </section>
  )
}

export function ManagerRemediationHistory({
  contexts,
}: {
  contexts: ManagerCorrectiveActionContext[]
}) {
  if (contexts.length === 0) return null

  return (
    <section aria-labelledby="remediation-history" className="space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">
          Historical context
        </p>
        <h2 id="remediation-history" className="mt-1 text-xl font-bold text-slate-950">
          Remediation History
        </h2>
      </div>
      <Card className="overflow-hidden">
        <div className="divide-y divide-slate-200">
          {contexts.map((context) => (
            <div key={context.action.id} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-success-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-950">
                      {context.action.title}
                    </h3>
                    <ActionStatusBadge status={context.action.status} />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {context.action.description}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Owner: {context.owner?.name ?? 'Unavailable'} · Due{' '}
                    {formatDate(context.action.dueAt)}
                    {context.defect
                      ? ` · Related defect ${context.defect.status}`
                      : ' · Related defect unavailable'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
