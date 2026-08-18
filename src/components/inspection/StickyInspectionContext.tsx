import { useEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useFieldInspectionContextHost } from '../layout/fieldInspectionContextHost'
import { InspectionProgress } from './InspectionProgress'

interface StickyInspectionContextProps {
  summaryRef: RefObject<HTMLElement | null>
  assetCode: string
  equipmentName: string
  checklistName: string
  completed: number
  total: number
}

export function StickyInspectionContext({
  summaryRef,
  assetCode,
  equipmentName,
  checklistName,
  completed,
  total,
}: StickyInspectionContextProps) {
  const [active, setActive] = useState(false)
  const contextHost = useFieldInspectionContextHost()

  useEffect(() => {
    const summary = summaryRef.current
    if (!summary || typeof IntersectionObserver === 'undefined') return
    const scrollContainer = summary.closest('main')
    const observer = new IntersectionObserver(
      ([entry]) => setActive(!entry.isIntersecting),
      { root: scrollContainer, threshold: 0.05 },
    )
    observer.observe(summary)
    return () => observer.disconnect()
  }, [summaryRef])

  if (!active || !contextHost) return null

  return createPortal(
    <aside
      className="border-b border-slate-200 bg-slate-50 text-slate-700"
      data-testid="sticky-inspection-context"
      data-active="true"
      data-completed={completed}
      aria-label="Current inspection context"
    >
      <div
        className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-5 gap-y-1.5 px-4 py-2 sm:flex-nowrap sm:px-6 lg:px-10"
        data-testid="sticky-context-bar"
      >
        <p className="min-w-0 flex-1 break-words text-xs leading-5">
          <span className="font-bold uppercase tracking-wide text-brand-700">
            {assetCode} · {equipmentName}
          </span>
          <span className="font-medium text-slate-600">
            {' '}· {checklistName}
          </span>
        </p>
        <div className="w-full shrink-0 sm:w-40">
          <InspectionProgress completed={completed} total={total} compact />
        </div>
      </div>
    </aside>,
    contextHost,
  )
}
