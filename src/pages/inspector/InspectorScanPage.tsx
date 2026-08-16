import { QrCode, ScanLine } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/feedback/LoadingState'
import {
  inspectionService,
  type InspectorQueueItem,
} from '../../services/inspectionService'

export function InspectorScanPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedInspection = searchParams.get('inspection')
  const assignmentOriginated = Boolean(requestedInspection)
  const [queue, setQueue] = useState<InspectorQueueItem[]>([])
  const [selectedId, setSelectedId] = useState(requestedInspection ?? '')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    void inspectionService
      .getInspectorQueue(user.id)
      .then((items) => {
        setQueue(items)
        setSelectedId((current) => current || items[0]?.inspection.id || '')
      })
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : 'Unable to load equipment.'),
      )
      .finally(() => setLoading(false))
  }, [user])

  const selected = queue.find((item) => item.inspection.id === selectedId)
  const requestedAssignmentAvailable = !requestedInspection || Boolean(selected)

  function simulateScan() {
    if (!selected) return
    setScanning(true)
    window.setTimeout(() => {
      navigate(
        `/inspector/equipment/${selected.equipment.id}?inspection=${selected.inspection.id}`,
      )
    }, 450)
  }

  if (loading) return <LoadingState label="Preparing simulated scanner…" />
  if (error || queue.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={QrCode}
          title={error ? 'Scanner unavailable' : 'No equipment to scan'}
          description={error || 'Start an assigned inspection from Home before scanning equipment.'}
        />
      </Card>
    )
  }

  if (!requestedAssignmentAvailable) {
    return (
      <Card>
        <EmptyState
          icon={QrCode}
          title="Assigned inspection unavailable"
          description="This inspection is no longer actionable or is not assigned to the active Inspector. Return Home to choose current work."
          action={<Button onClick={() => navigate('/inspector')}>Return Home</Button>}
        />
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Equipment verification</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Scan Equipment</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Position the equipment code in the frame. Camera access is simulated for this prototype.
        </p>
      </div>

      <Card className="mt-7 p-5 sm:p-7">
        <div className="relative mx-auto flex aspect-square max-w-xs items-center justify-center rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/60">
          <span className="absolute left-5 top-5 size-10 border-l-4 border-t-4 border-brand-700" />
          <span className="absolute right-5 top-5 size-10 border-r-4 border-t-4 border-brand-700" />
          <span className="absolute bottom-5 left-5 size-10 border-b-4 border-l-4 border-brand-700" />
          <span className="absolute bottom-5 right-5 size-10 border-b-4 border-r-4 border-brand-700" />
          <div className="text-center">
            <ScanLine aria-hidden="true" className="mx-auto size-20 text-navy-900" strokeWidth={1.4} />
            <p className="mt-3 text-sm font-bold text-slate-900">{selected?.equipment.assetCode}</p>
            <p className="mt-1 text-xs text-slate-500">
              {assignmentOriginated ? 'Expected assigned equipment' : 'Selected simulation target'}
            </p>
          </div>
        </div>

        {assignmentOriginated ? (
          <div className="mt-6 rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-800">
            Simulate scanning to verify the equipment assigned to this inspection.
          </div>
        ) : (
          <label className="mt-6 block text-sm font-bold text-slate-800">
            Select equipment to simulate
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-600 focus:outline-none"
            >
              {queue.map((item) => (
                <option key={item.inspection.id} value={item.inspection.id}>
                  {item.equipment.assetCode} — {item.equipment.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <Button size="lg" className="mt-5 w-full" onClick={simulateScan} disabled={scanning || !selected}>
          <QrCode aria-hidden="true" className="size-5" />
          {scanning ? 'Resolving equipment…' : 'Simulate Scan'}
        </Button>
      </Card>
    </div>
  )
}
