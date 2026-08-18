import { ClipboardCheck, Clock3, ListChecks } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/feedback/LoadingState'
import { InspectionCard } from '../../components/inspection/InspectionCard'
import {
  inspectionService,
  type InspectorQueueItem,
} from '../../services/inspectionService'

export function InspectorHomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [queue, setQueue] = useState<InspectorQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openingId, setOpeningId] = useState('')

  const loadQueue = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      setQueue(await inspectionService.getInspectorQueue(user.id))
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load assigned inspections.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  async function openInspection(item: InspectorQueueItem) {
    if (!user) return
    setOpeningId(item.inspection.id)
    try {
      if (item.inspection.status === 'Assigned') {
        navigate(`/inspector/scan?inspection=${item.inspection.id}`)
      } else {
        navigate(`/inspector/inspection/${item.inspection.id}`)
      }
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Unable to open inspection.')
      setOpeningId('')
    }
  }

  const inProgress = queue.filter((item) => item.inspection.status === 'In Progress').length
  const assigned = queue.length - inProgress

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inspector workspace"
        title={`Good day, ${user?.name.split(' ')[0] ?? 'Inspector'}`}
        description="Your assigned equipment inspections, ordered by due time."
      />

      <div className="grid grid-cols-2 gap-3 sm:max-w-xl sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <ListChecks aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-slate-950">{assigned}</p>
              <p className="text-xs font-medium text-slate-500">Assigned</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-warning-50 text-warning-800">
              <Clock3 aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-slate-950">{inProgress}</p>
              <p className="text-xs font-medium text-slate-500">In progress</p>
            </div>
          </div>
        </Card>
      </div>

      <section aria-labelledby="assigned-inspections-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="assigned-inspections-title" className="text-lg font-bold text-slate-950">
            Assigned Inspections
          </h2>
          <span className="text-xs font-semibold text-slate-500">{queue.length} total</span>
        </div>

        {loading ? <LoadingState label="Loading assigned inspections…" /> : null}
        {!loading && error ? (
          <Card>
            <EmptyState icon={ClipboardCheck} title="Unable to load inspections" description={error} />
          </Card>
        ) : null}
        {!loading && !error && queue.length === 0 ? (
          <Card>
            <EmptyState
              icon={ClipboardCheck}
              title="No assigned inspections"
              description="You have no pending equipment inspections. Completed work remains available in History."
            />
          </Card>
        ) : null}
        {!loading && !error && queue.length > 0 ? (
          <div className="space-y-3">
            {queue.map((item) => (
              <InspectionCard
                key={item.inspection.id}
                item={item}
                to={
                  item.inspection.status === 'Assigned'
                    ? `/inspector/scan?inspection=${item.inspection.id}`
                    : `/inspector/inspection/${item.inspection.id}`
                }
                busy={openingId === item.inspection.id}
                onAction={() => void openInspection(item)}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
