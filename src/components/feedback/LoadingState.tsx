import { LoaderCircle } from 'lucide-react'

interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Loading FieldSafe data…' }: LoadingStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500" role="status">
      <LoaderCircle aria-hidden="true" className="size-7 animate-spin text-brand-700" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}
