import { Camera, RefreshCw, Trash2 } from 'lucide-react'
import { DEMO_EVIDENCE } from '../../domain/evidence'
import type { EvidenceReference } from '../../domain/models'
import { Button } from '../common/Button'
import { EvidencePreview } from './EvidencePreview'

interface EvidenceAttachmentProps {
  value: EvidenceReference | null
  onChange(value: EvidenceReference | null): void
}

export function EvidenceAttachment({
  value,
  onChange,
}: EvidenceAttachmentProps) {
  if (value) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-3 p-3">
          <EvidencePreview
            evidence={value}
            alt="Attached defect evidence"
            className="size-16 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{value.label}</p>
            <p className="mt-1 text-xs text-success-700">Photo attached</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex size-11 items-center justify-center rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-700"
            aria-label="Remove photo evidence"
          >
            <Trash2 aria-hidden="true" className="size-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onChange(structuredClone(DEMO_EVIDENCE))}
          className="flex min-h-10 w-full items-center justify-center gap-2 border-t border-slate-200 text-xs font-bold text-brand-700 hover:bg-brand-50"
        >
          <RefreshCw aria-hidden="true" className="size-3.5" />
          Replace photo
        </button>
      </div>
    )
  }

  return (
    <Button
      variant="secondary"
      onClick={() => onChange(structuredClone(DEMO_EVIDENCE))}
      className="w-full sm:w-auto"
    >
      <Camera aria-hidden="true" className="size-4" />
      Add Photo
    </Button>
  )
}
