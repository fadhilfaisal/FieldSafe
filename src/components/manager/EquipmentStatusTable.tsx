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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50">
          <tr className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            <th scope="col" className="px-4 py-3">Equipment</th>
            <th scope="col" className="px-4 py-3">Type</th>
            <th scope="col" className="px-4 py-3">Site</th>
            <th scope="col" className="px-4 py-3">State</th>
            <th scope="col" className="px-4 py-3">Open risk</th>
            <th scope="col" className="px-4 py-3">Last inspection</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Detail</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((item) => (
            <tr
              key={item.equipment.id}
              className={cn(
                'border-l-4 text-sm text-slate-600 transition-colors hover:bg-slate-50/80',
                rowStateStyles[item.status],
              )}
            >
              <td className="px-4 py-4">
                <p className="font-bold text-brand-800">{item.equipment.assetCode}</p>
                <p className="mt-1 min-w-48 font-semibold text-slate-900">{item.equipment.name}</p>
              </td>
              <td className="px-4 py-4">{item.equipment.type}</td>
              <td className="px-4 py-4">{item.equipment.site}</td>
              <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
              <td className="px-4 py-4">
                {item.highestUnresolvedSeverity ? (
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={item.highestUnresolvedSeverity} />
                    <span className="text-xs font-semibold text-slate-500">
                      {item.unresolvedDefects.length}
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success-700">
                    <ShieldCheck aria-hidden="true" className="size-4" />
                    No unresolved defects
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-xs">
                {formatDateTime(item.latestInspection?.submittedAt ?? item.latestInspection?.completedAt ?? null)}
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  to={`/manager/equipment/${item.equipment.id}`}
                  aria-label={`View ${item.equipment.assetCode}`}
                  className="inline-flex size-10 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-50"
                >
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
