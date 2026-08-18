import { useEffect, useRef } from 'react'
import { Button } from '../common/Button'

interface ReviewRejectionDialogProps {
  open: boolean
  reason: string
  busy: boolean
  error: string
  onReasonChange(reason: string): void
  onCancel(): void
  onConfirm(): void
}

export function ReviewRejectionDialog({
  open,
  reason,
  busy,
  error,
  onReasonChange,
  onCancel,
  onConfirm,
}: ReviewRejectionDialogProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onCancel, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="reject-review-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <h2 id="reject-review-title" className="text-xl font-bold text-slate-950">Return inspection for revision?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">The inspection will be returned to the originating Inspector with their submitted responses retained.</p>
        <label htmlFor="rejection-reason" className="mt-5 block text-sm font-bold text-slate-800">Reason for revision</label>
        <textarea
          ref={inputRef}
          id="rejection-reason"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={4}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          placeholder="Explain what the Inspector needs to review or correct."
        />
        {error ? <p className="mt-2 text-sm font-semibold text-danger-700" role="alert">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>{busy ? 'Returning…' : 'Return for Revision'}</Button>
        </div>
      </div>
    </div>
  )
}
