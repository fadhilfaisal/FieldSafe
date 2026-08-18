import type { DefectCategoryMetric } from '../../services/managerService'

export function DefectCategoryTable({
  items,
  totalDefects,
}: {
  items: DefectCategoryMetric[]
  totalDefects: number
}) {
  return (
    <div
      className="overflow-x-auto rounded-lg border border-slate-200"
      data-testid="ranked-defect-categories"
    >
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50">
          <tr className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <th scope="col" className="w-16 px-4 py-3 text-center">Rank</th>
            <th scope="col" className="px-4 py-3">Defect category</th>
            <th scope="col" className="w-28 px-4 py-3 text-right">Defects</th>
            <th scope="col" className="w-28 px-4 py-3 text-right">% of total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((item, index) => {
            const percentage =
              totalDefects > 0
                ? Math.round((item.defectCount / totalDefects) * 100)
                : 0
            return (
              <tr
                key={item.category}
                data-category={item.category}
                data-count={item.defectCount}
                className="text-sm text-slate-700"
              >
                <td className="px-4 py-3 text-center font-bold text-slate-400">
                  {index + 1}
                </td>
                <th scope="row" className="max-w-xl break-words px-4 py-3 font-semibold text-slate-900">
                  {item.category}
                </th>
                <td className="px-4 py-3 text-right font-bold text-slate-950">
                  {item.defectCount}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-600">
                  {percentage}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
