import { Check, X } from 'lucide-react'
import type {
  ChecklistItem,
  DraftChecklistResponse,
  DraftDefect,
} from '../../domain/models'
import { cn } from '../../utils/cn'
import { DefectFields } from './DefectFields'

interface ChecklistItemCardProps {
  item: ChecklistItem
  response?: DraftChecklistResponse
  errors?: string[]
  onResult(result: DraftChecklistResponse['result']): void
  onDefectChange(patch: Partial<DraftDefect>): void
}

export function ChecklistItemCard({
  item,
  response,
  errors = [],
  onResult,
  onDefectChange,
}: ChecklistItemCardProps) {
  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border bg-white shadow-sm',
        errors.length > 0 ? 'border-danger-200' : 'border-slate-200',
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
            {item.sequence}
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-950">{item.category}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{item.prompt}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:ml-10">
          <button
            type="button"
            onClick={() => onResult('Pass')}
            aria-pressed={response?.result === 'Pass'}
            className={cn(
              'flex min-h-12 items-center justify-center gap-2 rounded-lg border text-sm font-bold transition-colors',
              response?.result === 'Pass'
                ? 'border-success-600 bg-success-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-success-50 hover:text-success-700',
            )}
          >
            <Check aria-hidden="true" className="size-4" />
            Pass
          </button>
          <button
            type="button"
            onClick={() => onResult('Fail')}
            aria-pressed={response?.result === 'Fail'}
            className={cn(
              'flex min-h-12 items-center justify-center gap-2 rounded-lg border text-sm font-bold transition-colors',
              response?.result === 'Fail'
                ? 'border-danger-600 bg-danger-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-danger-50 hover:text-danger-700',
            )}
          >
            <X aria-hidden="true" className="size-4" />
            Fail
          </button>
        </div>

        {errors.length > 0 && response?.result !== 'Fail' ? (
          <p className="mt-3 text-xs font-semibold text-danger-700 sm:ml-10" role="alert">
            {errors.join(' ')}
          </p>
        ) : null}
      </div>

      {response?.result === 'Fail' ? (
        <DefectFields
          value={response.defect}
          errors={errors}
          onChange={onDefectChange}
        />
      ) : null}
    </article>
  )
}
