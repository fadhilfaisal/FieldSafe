import type { EquipmentTypeCompliance } from '../../services/managerService'

export function EquipmentPerformanceTable({
  items,
}: {
  items: EquipmentTypeCompliance[]
}) {
  return (
    <div className="overflow-x-auto" data-testid="equipment-performance-table">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50">
          <tr className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <th scope="col" className="px-5 py-3">Equipment type</th>
            <th scope="col" className="px-4 py-3 text-right">Completed</th>
            <th scope="col" className="px-4 py-3 text-right">Passed</th>
            <th scope="col" className="px-4 py-3 text-right">Failed</th>
            <th scope="col" className="min-w-52 px-5 py-3">Pass rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((item) => (
            <tr key={item.equipmentType} className="text-sm text-slate-700">
              <th scope="row" className="px-5 py-4 font-bold text-slate-950">
                {item.equipmentType}
              </th>
              <td className="px-4 py-4 text-right font-semibold">{item.inspectionCount}</td>
              <td className="px-4 py-4 text-right font-semibold text-success-700">{item.passedCount}</td>
              <td className="px-4 py-4 text-right font-semibold text-danger-700">{item.failedCount}</td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-2.5 min-w-28 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <span className="bg-success-600" style={{ width: `${item.complianceRate}%` }} />
                    <span className="bg-danger-600" style={{ width: `${item.inspectionCount > 0 ? 100 - item.complianceRate : 0}%` }} />
                  </div>
                  <span className="w-12 text-right font-bold text-slate-950">
                    {item.inspectionCount > 0 ? `${item.complianceRate}%` : '—'}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
