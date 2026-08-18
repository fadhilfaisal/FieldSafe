import { AlertTriangle, CalendarClock, MapPin, Play, RotateCcw } from 'lucide-react'
import type { InspectorQueueItem } from '../../services/inspectionService'
import { Button } from '../common/Button'
import { Card } from '../common/Card'
import { CardNavigationOverlay } from '../common/CardNavigationOverlay'

interface InspectionCardProps {
  item: InspectorQueueItem
  to: string
  onAction(): void
  busy?: boolean
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function InspectionCard({
  item,
  to,
  onAction,
  busy = false,
}: InspectionCardProps) {
  const inProgress = item.inspection.status === 'In Progress'

  return (
    <Card className="group relative p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/20 sm:p-5">
      <CardNavigationOverlay
        to={to}
        label={`${inProgress ? 'Continue' : 'Start'} inspection for ${item.equipment.assetCode}`}
      />
      <div className="pointer-events-none relative z-20 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-950">
              {item.equipment.assetCode}
            </span>
            <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
              {inProgress ? 'In progress' : 'Assigned'}
            </span>
            {item.overdue ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-danger-100 bg-danger-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-danger-700">
                <AlertTriangle aria-hidden="true" className="size-3" />
                Overdue
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 truncate text-base font-bold text-slate-900">
            {item.equipment.name}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {item.equipment.type} · {item.checklist.name}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-3.5" />
              {item.equipment.site}
            </span>
            <span className={item.overdue ? 'inline-flex items-center gap-1.5 font-bold text-danger-700' : 'inline-flex items-center gap-1.5'}>
              <CalendarClock aria-hidden="true" className="size-3.5" />
              Due {formatDueDate(item.inspection.dueAt)}
            </span>
          </div>
        </div>
        <Button
          onClick={onAction}
          disabled={busy}
          className="pointer-events-auto w-full shrink-0 sm:w-auto"
        >
          {inProgress ? (
            <RotateCcw aria-hidden="true" className="size-4" />
          ) : (
            <Play aria-hidden="true" className="size-4" />
          )}
          {busy ? 'Opening…' : inProgress ? 'Continue' : 'Start Inspection'}
        </Button>
      </div>
    </Card>
  )
}
