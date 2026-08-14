import { CheckCircle2, CloudOff, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useConnectivity } from '../../connectivity/useConnectivity'

export function ConnectivityNotice() {
  const { connectivity, error, syncActivity } = useConnectivity()

  if (error) {
    return (
      <div
        className="mb-5 flex items-center gap-3 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm font-semibold text-danger-700"
        role="alert"
      >
        <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
        {error}
      </div>
    )
  }

  if (connectivity === 'OFFLINE') {
    return (
      <div
        className="mb-5 flex items-center gap-3 rounded-xl border border-warning-100 bg-warning-50 p-3 text-sm font-semibold text-warning-800"
        role="status"
      >
        <CloudOff aria-hidden="true" className="size-5 shrink-0" />
        Offline demo mode — inspections will be saved on this device.
      </div>
    )
  }

  if (syncActivity === 'SYNCING') {
    return (
      <div
        className="mb-5 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm font-semibold text-brand-700"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle
          aria-hidden="true"
          className="size-5 shrink-0 animate-spin"
        />
        Syncing saved offline inspections…
      </div>
    )
  }

  if (syncActivity === 'SYNCED') {
    return (
      <div
        className="mb-5 flex items-center gap-3 rounded-xl border border-success-100 bg-success-50 p-3 text-sm font-semibold text-success-700"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
        Saved offline inspections are now synced.
      </div>
    )
  }

  return null
}
