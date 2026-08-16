import { AlertCircle, AlertTriangle, CircleAlert } from 'lucide-react'
import type { DraftDefect, DefectSeverity } from '../../domain/models'
import { cn } from '../../utils/cn'
import { EvidenceAttachment } from './EvidenceAttachment'

interface DefectFieldsProps {
  value: DraftDefect | null
  errors?: string[]
  onChange(patch: Partial<DraftDefect>): void
}

const severities: DefectSeverity[] = ['Minor', 'Major', 'Critical']

const severityStyles: Record<DefectSeverity, string> = {
  Minor: 'border-brand-200 bg-brand-50 text-brand-700',
  Major: 'border-warning-600 bg-warning-50 text-warning-800',
  Critical: 'border-danger-600 bg-danger-50 text-danger-700',
}

const severityGuidance: Record<DefectSeverity, string> = {
  Minor: 'Equipment may remain Fit depending on other unresolved defects.',
  Major: 'Equipment will be Restricted while this defect remains unresolved.',
  Critical: 'Equipment will be Out of Service while this defect remains unresolved.',
}

const severityIcons = {
  Minor: AlertCircle,
  Major: AlertTriangle,
  Critical: CircleAlert,
}

export function DefectFields({
  value,
  errors = [],
  onChange,
}: DefectFieldsProps) {
  return (
    <div className="mt-4 space-y-5 border-t border-danger-100 bg-danger-50/40 p-4 sm:rounded-b-lg sm:p-5">
      <div>
        <label className="text-sm font-bold text-slate-900">
          Defect description <span className="text-danger-700">*</span>
          <textarea
            defaultValue={value?.description ?? ''}
            onBlur={(event) => onChange({ description: event.target.value.trim() })}
            rows={3}
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm font-normal leading-6 text-slate-900 focus:border-brand-600 focus:outline-none"
            placeholder="Describe what is damaged and where it was observed"
          />
        </label>
        <p className="mt-1.5 text-xs text-slate-500">Describe what is damaged and where it was observed. Use at least 5 characters.</p>
      </div>

      <fieldset>
        <legend className="text-sm font-bold text-slate-900">
          Severity <span className="text-danger-700">*</span>
        </legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {severities.map((severity) => {
            const selected = value?.severity === severity
            const Icon = severityIcons[severity]
            return (
              <button
                key={severity}
                type="button"
                onClick={() => onChange({ severity })}
                aria-pressed={selected}
                className={cn(
                  'inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg border text-xs font-bold transition-colors',
                  selected
                    ? severityStyles[severity]
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {severity}
              </button>
            )
          })}
        </div>
        {value?.severity ? (
          <p className={cn('mt-2 rounded-lg border p-3 text-xs font-semibold leading-5', severityStyles[value.severity])}>
            {severityGuidance[value.severity]}
          </p>
        ) : null}
      </fieldset>

      <div>
        <p className="text-sm font-bold text-slate-900">
          Photo evidence <span className="text-danger-700">*</span>
        </p>
        <div className="mt-2">
          <EvidenceAttachment
            value={value?.evidenceReference ?? null}
            onChange={(evidenceReference) => onChange({ evidenceReference })}
          />
        </div>
      </div>

      {errors.length > 0 ? (
        <ul className="space-y-1 text-xs font-semibold text-danger-700" aria-live="polite">
          {errors.map((error) => <li key={error}>• {error}</li>)}
        </ul>
      ) : null}
    </div>
  )
}
