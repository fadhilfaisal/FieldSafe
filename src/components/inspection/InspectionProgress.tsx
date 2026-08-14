interface InspectionProgressProps {
  completed: number
  total: number
}

export function InspectionProgress({
  completed,
  total,
}: InspectionProgressProps) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
        <span>{completed} of {total} complete</span>
        <span>{percentage}%</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-label="Checklist progress"
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
