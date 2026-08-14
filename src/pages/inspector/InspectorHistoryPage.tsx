import { History } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { SeverityBadge } from '../../components/common/SeverityBadge'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingState } from '../../components/feedback/LoadingState'
import { inspectionService } from '../../services/inspectionService'
import { formatDateTime } from '../../utils/format'

type HistoryItem = Awaited<ReturnType<typeof inspectionService.getInspectorHistory>>[number]

const severityRank = { Minor: 1, Major: 2, Critical: 3 } as const

export function InspectorHistoryPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    void inspectionService
      .getInspectorHistory(user.id)
      .then(setItems)
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : 'Unable to load inspection history.'),
      )
      .finally(() => setLoading(false))
  }, [user])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inspector workspace"
        title="Inspection History"
        description="Completed inspections recorded for your Inspector account."
      />

      {loading ? <LoadingState label="Loading inspection history…" /> : null}
      {!loading && (error || items.length === 0) ? (
        <Card>
          <EmptyState
            icon={History}
            title={error ? 'History unavailable' : 'No completed inspections'}
            description={error || 'Submitted inspections will appear here.'}
          />
        </Card>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <div className="space-y-3">
          {items.map(({ inspection, equipment, defects }) => {
            const highestSeverity = defects
              .map((defect) => defect.severity)
              .sort((a, b) => severityRank[b] - severityRank[a])[0]
            return (
              <Card key={inspection.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-950">{equipment.assetCode}</span>
                      <StatusBadge status={inspection.result!} />
                      {highestSeverity ? <SeverityBadge severity={highestSeverity} /> : null}
                    </div>
                    <h2 className="mt-2 text-sm font-bold text-slate-900">{equipment.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{equipment.site} · {formatDateTime(inspection.completedAt)}</p>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{inspection.status}</span>
                </div>
              </Card>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
