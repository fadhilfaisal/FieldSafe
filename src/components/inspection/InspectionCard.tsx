import { CalendarClock, MapPin, Play, RotateCcw } from 'lucide-react'
import type { InspectorQueueItem } from '../../services/inspectionService'
import { Button } from '../common/Button'
import { Card } from '../common/Card'

interface InspectionCardProps {
  item: InspectorQueueItem
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
  onAction,
  busy = false,
}: InspectionCardProps) {
  const inProgress = item.inspection.status === 'In Progress'

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-950">
              {item.equipment.assetCode}
            </span>
            <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
              {inProgress ? 'In progress' : 'Assigned'}
            </span>
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
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock aria-hidden="true" className="size-3.5" />
              Due {formatDueDate(item.inspection.dueAt)}
            </span>
          </div>
        </div>
        <Button
          onClick={onAction}
          disabled={busy}
          className="w-full shrink-0 sm:w-auto"
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
