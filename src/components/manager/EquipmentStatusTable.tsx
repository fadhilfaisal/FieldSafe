import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { SeverityBadge } from '../common/SeverityBadge'
import { StatusBadge } from '../common/StatusBadge'
import type { ManagerEquipmentListItem } from '../../services/managerService'
import { formatDateTime } from '../../utils/format'
import { cn } from '../../utils/cn'

interface EquipmentStatusTableProps {
  items: ManagerEquipmentListItem[]
}

const rowStateStyles = {
  Fit: 'border-l-success-600',
  Restricted: 'border-l-warning-600',
  'Out of Service': 'border-l-danger-600',
}

export function EquipmentStatusTable({ items }: EquipmentStatusTableProps) {
  return (
    <div
      className="fleet-status-board"
      data-responsive-layout="equipment-context"
    >
      <div
        className="fleet-status-header fleet-status-grid"
        aria-hidden="true"
      >
        <span className="fleet-status-equipment">Equipment</span>
        <span className="fleet-status-type">Type</span>
        <span className="fleet-status-site">Site</span>
        <span className="fleet-status-state">State</span>
        <span className="fleet-status-risk">Open risk</span>
        <span className="fleet-status-inspection">Last inspection</span>
        <span className="fleet-status-affordance" />
      </div>

      <ul
        className="divide-y divide-slate-100 bg-white"
        aria-label="Fleet equipment status"
      >
        {items.map((item) => (
          <li key={item.equipment.id}>
            <Link
              to={`/manager/equipment/${item.equipment.id}`}
              aria-label={`View ${item.equipment.assetCode}`}
              data-equipment-row-link={item.equipment.id}
              className={cn(
                'fleet-status-row fleet-status-grid group border-l-4 text-sm text-slate-600 transition-colors hover:bg-slate-50/80 focus-visible:relative focus-visible:z-10 focus-visible:bg-brand-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600',
                rowStateStyles[item.status],
              )}
              onKeyDown={(event) => {
                if (event.key === ' ') {
                  event.preventDefault()
                  event.currentTarget.click()
                }
              }}
            >
              <div className="fleet-status-equipment">
                <p className="font-bold text-brand-800">
                  {item.equipment.assetCode}
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {item.equipment.name}
                </p>
                <p
                  className="fleet-status-equipment-context mt-1.5 text-xs text-slate-500"
                  data-equipment-context="type-site"
                >
                  <span>{item.equipment.type}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.equipment.site}</span>
                </p>
              </div>

              <div className="fleet-status-type">{item.equipment.type}</div>
              <div className="fleet-status-site">{item.equipment.site}</div>

              <div className="fleet-status-state">
                <span className="fleet-status-inline-label">State</span>
                <StatusBadge status={item.status} className="whitespace-nowrap" />
              </div>

              <div className="fleet-status-risk">
                <span className="fleet-status-inline-label">Open risk</span>
                {item.highestUnresolvedSeverity ? (
                  <span
                    className="inline-flex flex-nowrap items-center gap-1.5 whitespace-nowrap"
                    data-open-risk={item.highestUnresolvedSeverity}
                  >
                    <SeverityBadge
                      severity={item.highestUnresolvedSeverity}
                      className="whitespace-nowrap"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      {item.unresolvedDefects.length}{' '}
                      {item.unresolvedDefects.length === 1
                        ? 'defect'
                        : 'defects'}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex flex-nowrap items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-success-700">
                    <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
                    No open risk
                  </span>
                )}
              </div>

              <div className="fleet-status-inspection text-xs leading-5">
                <span className="fleet-status-inline-label">
                  Last inspection
                </span>
                <span data-last-inspection="timestamp">
                  {formatDateTime(
                    item.latestInspection?.submittedAt ??
                      item.latestInspection?.completedAt ??
                      null,
                  )}
                </span>
              </div>

              <span
                className="fleet-status-affordance inline-flex items-center justify-center text-brand-700 group-hover:text-brand-800"
                aria-hidden="true"
                data-affordance-cell="reserved"
              >
                <span
                  className="inline-flex size-8 items-center justify-center rounded-lg"
                  data-row-affordance="arrow"
                >
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
