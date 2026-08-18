import { Check, X } from 'lucide-react'
import type {
  ChecklistItem,
  Defect,
  DraftDefect,
} from '../../domain/models'
import { SeverityBadge } from '../common/SeverityBadge'
import { EvidencePreview } from './EvidencePreview'

interface ReadOnlyInspectionResponseRowProps {
  item: ChecklistItem
  result: 'Pass' | 'Fail'
  defect: Defect | DraftDefect | null
}

export function ReadOnlyInspectionResponseRow({
  item,
  result,
  defect,
}: ReadOnlyInspectionResponseRowProps) {
  if (result === 'Pass') {
    return (
      <div
        className="flex items-start justify-between gap-4 bg-slate-25/50 px-5 py-2.5"
        data-response-result="Pass"
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
          Pass
        </span>
      </div>
    )
  }

  return (
    <article
      className="border-l-4 border-danger-600 bg-white"
      data-response-result="Fail"
      data-response-sequence={item.sequence}
      data-inline-defect={item.id}
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
          {defect?.severity ? (
            <SeverityBadge severity={defect.severity} />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Inspector observation
          </p>
          <p className="mt-1.5 text-sm leading-6 text-slate-700">
            {defect?.description || 'Defect description unavailable.'}
          </p>
          {defect?.evidenceReference ? (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Evidence: {defect.evidenceReference.label}
            </p>
          ) : null}
        </div>
        {defect?.evidenceReference ? (
          <EvidencePreview
            evidence={defect.evidenceReference}
            alt={`Evidence for ${item.category} defect`}
            className="h-24 w-full rounded-lg object-cover sm:h-20"
          />
        ) : null}
      </div>
    </article>
  )
}
