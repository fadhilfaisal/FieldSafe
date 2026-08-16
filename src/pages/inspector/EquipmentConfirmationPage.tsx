import { ArrowRight, CalendarClock, MapPin, ShieldCheck, Truck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/feedback/LoadingState'
import { useInspectionWorkspace } from '../../hooks/useInspectionWorkspace'
import { inspectionService } from '../../services/inspectionService'
import { formatDateTime } from '../../utils/format'

export function EquipmentConfirmationPage() {
  const { id: equipmentId } = useParams()
  const [searchParams] = useSearchParams()
  const inspectionId = searchParams.get('inspection') ?? undefined
  const { user } = useAuth()
  const navigate = useNavigate()
  const { workspace, loading, error } = useInspectionWorkspace(inspectionId, user?.id)
  const [proceeding, setProceeding] = useState(false)
  const mismatch = workspace && workspace.equipment.id !== equipmentId

  async function proceed() {
    if (!workspace || !user) return
    setProceeding(true)
    await inspectionService.startInspection(workspace.inspection.id, user.id)
    navigate(`/inspector/inspection/${workspace.inspection.id}`)
  }

  if (loading) return <LoadingState label="Confirming equipment…" />
  if (error || !workspace || mismatch) {
    return (
      <Card>
        <EmptyState
          icon={Truck}
          title="Equipment could not be confirmed"
          description={mismatch ? 'The scanned equipment does not match this assigned inspection.' : error || 'Equipment not found.'}
        />
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-50 text-success-700">
          <ShieldCheck aria-hidden="true" className="size-7" />
        </span>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-success-700">Assigned equipment matched</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Confirm Equipment</h1>
        <p className="mt-2 text-sm text-slate-600">The simulated scan verified the equipment assigned to this inspection.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-brand-700">{workspace.equipment.assetCode}</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">{workspace.equipment.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{workspace.equipment.type} · {workspace.equipment.manufacturer} {workspace.equipment.model}</p>
            </div>
            <StatusBadge status={workspace.equipment.status} />
          </div>
        </div>
        <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><MapPin className="size-4" />Site</dt>
            <dd className="mt-2 text-sm font-semibold text-slate-900">{workspace.equipment.site}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><CalendarClock className="size-4" />Due</dt>
            <dd className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(workspace.inspection.dueAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Assigned checklist</dt>
            <dd className="mt-2 text-sm font-semibold text-slate-900">{workspace.checklist.name}</dd>
          </div>
        </dl>
      </Card>

      <Button size="lg" className="w-full" onClick={() => void proceed()} disabled={proceeding}>
        {proceeding ? 'Opening checklist…' : 'Confirm & Continue'}
        <ArrowRight aria-hidden="true" className="size-5" />
      </Button>
    </div>
  )
}
