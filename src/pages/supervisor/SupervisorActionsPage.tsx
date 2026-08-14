import { Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/feedback/LoadingState'
import { CorrectiveActionCard } from '../../components/supervisor/CorrectiveActionCard'
import type { CorrectiveActionStatus } from '../../domain/models'
import {
  supervisorService,
  type SupervisorActionListItem,
} from '../../services/supervisorService'
import { cn } from '../../utils/cn'

type ActionFilter = 'All' | CorrectiveActionStatus | 'Overdue'

export function SupervisorActionsPage() {
  const [actions, setActions] = useState<SupervisorActionListItem[]>([])
  const [filter, setFilter] = useState<ActionFilter>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void supervisorService
      .getActions()
      .then((items) => {
        if (active) setActions(items)
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load corrective actions.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(
    () =>
      actions.filter((item) => {
        if (filter === 'All') return true
        if (filter === 'Overdue') return item.overdue
        return item.action.status === filter
      }),
    [actions, filter],
  )

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Supervisor workflow" title="Corrective Actions" description="Assigned corrective work with lifecycle, ownership, due-date, and originating defect context." />
      <div className="flex flex-wrap gap-2" aria-label="Corrective action filter">
        {(['All', 'Open', 'In Progress', 'Done', 'Overdue'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={cn(
              'min-h-10 rounded-lg border px-4 text-sm font-semibold',
              filter === value
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {value}
          </button>
        ))}
      </div>
      {loading ? <LoadingState label="Loading corrective actions…" /> : null}
      {!loading && error ? <Card><EmptyState icon={Wrench} title="Unable to load actions" description={error} /></Card> : null}
      {!loading && !error && filtered.length === 0 ? <Card><EmptyState icon={Wrench} title="No corrective actions" description="There are no actions matching this lifecycle filter." /></Card> : null}
      {!loading && !error && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => <CorrectiveActionCard key={item.action.id} item={item} />)}
        </div>
      ) : null}
    </div>
  )
}
