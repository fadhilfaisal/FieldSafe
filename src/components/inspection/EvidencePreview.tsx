import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import {
  resolveEvidenceAssetPath,
} from '../../domain/evidence'
import type { EvidenceReference } from '../../domain/models'
import { cn } from '../../utils/cn'

interface EvidencePreviewProps {
  evidence: EvidenceReference
  alt: string
  className?: string
}

export function EvidencePreview({
  evidence,
  alt,
  className,
}: EvidencePreviewProps) {
  const source = resolveEvidenceAssetPath(evidence)
  const [failedSource, setFailedSource] = useState<string | null>(null)

  if (failedSource === source) {
    return (
      <div
        role="img"
        aria-label={`${evidence.label} preview unavailable`}
        className={cn(
          'flex flex-col items-center justify-center gap-1 bg-slate-100 text-center text-slate-500',
          className,
        )}
      >
        <ImageOff aria-hidden="true" className="size-5" />
        <span className="px-1 text-[0.625rem] font-semibold">Preview unavailable</span>
      </div>
    )
  }

  return (
    <img
      src={source}
      alt={alt}
      className={className}
      onError={() => setFailedSource(source)}
    />
  )
}
