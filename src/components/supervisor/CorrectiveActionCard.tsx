import { ArrowRight, CalendarDays, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import type { SupervisorActionListItem } from '../../services/supervisorService'
import { formatDate } from '../../utils/format'
import { Card } from '../common/Card'
import { SeverityBadge } from '../common/SeverityBadge'
import {
  ActionStatusBadge,
  OverdueBadge,
} from './WorkflowBadges'

export function CorrectiveActionCard({
  item,
}: {
  item: SupervisorActionListItem
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
              {item.equipment.assetCode}
            </span>
            <ActionStatusBadge status={item.action.status} overdue={item.overdue} />
            {item.overdue ? <OverdueBadge /> : null}
            <SeverityBadge severity={item.defect.severity} />
          </div>
          <h3 className="mt-2 text-base font-bold text-slate-950">
            {item.action.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
            {item.action.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
            <span>{item.equipment.name}</span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound aria-hidden="true" className="size-3.5" />
              {item.owner.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              Due {formatDate(item.action.dueAt)}
            </span>
          </div>
        </div>
        <Link
          to={`/supervisor/actions/${item.action.id}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          View action
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </Card>
  )
}
