import { Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { LoadingState } from '../../components/feedback/LoadingState'
import { EquipmentStatusTable } from '../../components/manager/EquipmentStatusTable'
import type { EquipmentStatus, EquipmentType } from '../../domain/models'
import {
  managerService,
  type ManagerEquipmentListItem,
} from '../../services/managerService'
import { cn } from '../../utils/cn'

type StateFilter = 'All' | EquipmentStatus
type TypeFilter = 'All' | EquipmentType

const stateFilters: StateFilter[] = ['All', 'Fit', 'Restricted', 'Out of Service']
const typeFilters: TypeFilter[] = ['All', 'Truck', 'Crane', 'Forklift', 'MEWP', 'Loader']
const activeStateFilterStyles: Record<StateFilter, string> = {
  All: 'border-brand-700 bg-brand-700 text-white',
  Fit: 'border-success-600 bg-success-50 text-success-700',
  Restricted: 'border-warning-600 bg-warning-50 text-warning-800',
  'Out of Service': 'border-danger-600 bg-danger-50 text-danger-700',
}

export function ManagerEquipmentPage() {
  const [items, setItems] = useState<ManagerEquipmentListItem[]>([])
  const [stateFilter, setStateFilter] = useState<StateFilter>('All')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void managerService
      .getEquipmentBoard()
      .then((equipment) => {
        if (active) setItems(equipment)
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load equipment.')
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
      items.filter(
        (item) =>
          (stateFilter === 'All' || item.status === stateFilter) &&
          (typeFilter === 'All' || item.equipment.type === typeFilter),
      ),
    [items, stateFilter, typeFilter],
  )

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Management visibility" title="Equipment Status" description="Canonical fleet safety state derived from unresolved persisted defects." />

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800">Safety state</p>
          <div className="mt-2 flex flex-wrap gap-2" aria-label="Equipment state filter">
            {stateFilters.map((status) => (
              <button key={status} type="button" onClick={() => setStateFilter(status)} aria-pressed={stateFilter === status} className={cn('min-h-10 rounded-lg border px-4 text-sm font-semibold transition-colors', stateFilter === status ? activeStateFilterStyles[status] : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}>
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full lg:w-56">
          <label htmlFor="equipment-type-filter" className="text-sm font-bold text-slate-800">Equipment type</label>
          <select id="equipment-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700">
            {typeFilters.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>

      {loading ? <LoadingState label="Loading equipment status board…" /> : null}
      {!loading && error ? <Card><EmptyState icon={Truck} title="Unable to load equipment" description={error} /></Card> : null}
      {!loading && !error && filtered.length === 0 ? <Card><EmptyState icon={Truck} title="No matching equipment" description="No equipment matches the selected state and type filters." /></Card> : null}
      {!loading && !error && filtered.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-950">Fleet Status Board</h2>
            <span className="text-sm font-semibold text-slate-500">{filtered.length} of {items.length}</span>
          </div>
          <EquipmentStatusTable items={filtered} />
        </Card>
      ) : null}
    </div>
  )
}
