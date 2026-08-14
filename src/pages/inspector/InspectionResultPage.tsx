import { CheckCircle2, Home, XCircle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/feedback/LoadingState'
import { useInspectionWorkspace } from '../../hooks/useInspectionWorkspace'

export function InspectionResultPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { workspace, loading, error } = useInspectionWorkspace(id, user?.id)

  if (loading) return <LoadingState label="Loading submission result…" />
  if (error || !workspace || workspace.inspection.status !== 'Completed') {
    return (
      <Card>
        <EmptyState title="Submission result unavailable" description={error || 'This inspection has not been submitted.'} />
      </Card>
    )
  }

  const passed = workspace.inspection.result === 'Pass'
  const criticalCount = workspace.defects.filter((defect) => defect.severity === 'Critical').length

  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className={`mx-auto flex size-20 items-center justify-center rounded-full ${passed ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'}`}>
        {passed ? <CheckCircle2 aria-hidden="true" className="size-11" /> : <XCircle aria-hidden="true" className="size-11" />}
      </span>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Submission complete</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Inspection Submitted</h1>
      <p className="mt-3 text-sm text-slate-600">{workspace.equipment.assetCode} · {workspace.equipment.name}</p>

      <Card className="mt-7 p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Result</p>
            <div className="mt-3"><StatusBadge status={workspace.inspection.result!} /></div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Equipment</p>
            <div className="mt-3"><StatusBadge status={workspace.equipment.status} /></div>
          </div>
        </div>
        {!passed ? (
          <p className="mt-5 text-sm font-semibold leading-6 text-danger-700">
            {workspace.defects.length} defect{workspace.defects.length === 1 ? '' : 's'} recorded.
            {criticalCount > 0 ? ` ${criticalCount} critical defect${criticalCount === 1 ? '' : 's'} recorded.` : ''}
          </p>
        ) : (
          <p className="mt-5 text-sm font-semibold text-success-700">All checklist items passed.</p>
        )}
      </Card>

      <Button size="lg" className="mt-7 w-full" onClick={() => navigate('/inspector')}>
        <Home aria-hidden="true" className="size-5" />
        Return Home
      </Button>
    </div>
  )
}
