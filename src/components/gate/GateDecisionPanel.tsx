import { AlertTriangle, CheckCircle2, MapPin, XCircle } from 'lucide-react'
import { Button } from '../common/Button'
import { StatusBadge } from '../common/StatusBadge'
import type { GateCheckResult } from '../../services/gateService'

const decisionPresentation = {
  Allowed: {
    Icon: CheckCircle2,
    container: 'border-success-200 bg-success-50/70',
    icon: 'bg-success-600 text-white',
    decision: 'text-success-700',
    explanation: 'Equipment is fit for use and may enter the operating area.',
  },
  Restricted: {
    Icon: AlertTriangle,
    container: 'border-warning-200 bg-warning-50/80',
    icon: 'bg-warning-600 text-white',
    decision: 'text-warning-800',
    explanation: 'Entry is restricted. Follow site controls before this equipment enters or operates.',
  },
  Denied: {
    Icon: XCircle,
    container: 'border-danger-200 bg-danger-50/80',
    icon: 'bg-danger-600 text-white',
    decision: 'text-danger-700',
    explanation: 'This equipment must not enter or operate. It is currently out of service.',
  },
} as const

interface GateDecisionPanelProps {
  result: GateCheckResult
  onCheckAnother(): void
}

export function GateDecisionPanel({
  result,
  onCheckAnother,
}: GateDecisionPanelProps) {
  const presentation = decisionPresentation[result.decision]
  const Icon = presentation.Icon

  return (
    <section
      className={`rounded-2xl border-2 p-6 text-center shadow-card sm:p-9 ${presentation.container}`}
      aria-labelledby="gate-decision-title"
      aria-live="polite"
    >
      <span className={`mx-auto flex size-24 items-center justify-center rounded-full shadow-lg sm:size-28 ${presentation.icon}`}>
        <Icon aria-hidden="true" className="size-14 sm:size-16" strokeWidth={2.4} />
      </span>
      <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Gate decision</p>
      <h2 id="gate-decision-title" className={`mt-1 text-5xl font-black tracking-tight sm:text-6xl ${presentation.decision}`}>
        {result.decision.toUpperCase()}
      </h2>

      <div className="mx-auto mt-6 max-w-xl rounded-xl border border-white/80 bg-white/85 p-5">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-800">{result.equipment.assetCode}</p>
        <h3 className="mt-1 text-2xl font-bold text-slate-950">{result.equipment.name}</h3>
        <p className="mt-1 text-sm text-slate-600">{result.equipment.type} · {result.equipment.manufacturer} {result.equipment.model}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <StatusBadge status={result.status} />
          <span className="inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold text-slate-600">
            <MapPin aria-hidden="true" className="size-4" />
            {result.equipment.site}
          </span>
        </div>
      </div>

      <p className={`mx-auto mt-5 max-w-xl text-base font-bold leading-7 ${presentation.decision}`}>
        {presentation.explanation}
      </p>
      <Button size="lg" variant="secondary" className="mt-7 min-w-64" onClick={onCheckAnother}>
        Check Another Equipment
      </Button>
    </section>
  )
}
