import { ShieldCheck } from 'lucide-react'
import { cn } from '../../utils/cn'

interface BrandMarkProps {
  compact?: boolean
  inverted?: boolean
}

export function BrandMark({ compact = false, inverted = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          inverted ? 'bg-white/12 text-white' : 'bg-brand-700 text-white',
        )}
      >
        <ShieldCheck aria-hidden="true" className="size-5" strokeWidth={2.4} />
      </span>
      {!compact ? (
        <div className="leading-none">
          <span className={cn('text-base font-bold', inverted ? 'text-white' : 'text-navy-950')}>
            FieldSafe
          </span>
          <span
            className={cn(
              'mt-1 block text-[10px] font-medium uppercase tracking-[0.12em]',
              inverted ? 'text-blue-100' : 'text-slate-500',
            )}
          >
            Equipment safety
          </span>
        </div>
      ) : null}
    </div>
  )
}
