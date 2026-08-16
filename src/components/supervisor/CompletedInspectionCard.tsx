import { ArrowRight, MapPin, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import type { SupervisorReviewListItem } from '../../services/supervisorService'
import { formatDateTime } from '../../utils/format'
import { Card } from '../common/Card'
import { StatusBadge } from '../common/StatusBadge'

export function CompletedInspectionCard({
  item,
}: {
  item: SupervisorReviewListItem
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
              {item.inspection.id} · {item.equipment.assetCode}
            </span>
            <StatusBadge status="Completed" />
            {item.inspection.result ? (
              <StatusBadge status={item.inspection.result} />
            ) : null}
          </div>
          <h3 className="mt-2 text-sm font-bold text-slate-950">
            {item.equipment.name}
          </h3>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <UserRound aria-hidden="true" className="size-3.5" />
              {item.inspector.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-3.5" />
              {item.equipment.site}
            </span>
            <span>Completed {formatDateTime(item.inspection.submittedAt)}</span>
          </div>
        </div>
        <Link
          to={`/supervisor/reviews/${item.inspection.id}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50"
          aria-label={`View completed inspection ${item.inspection.id}`}
        >
          View
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </Card>
  )
}
