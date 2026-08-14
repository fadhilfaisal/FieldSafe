import { ScanLine } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'

export function GatePage() {
  return (
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Gate check</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Focused gate workspace</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
        FieldSafe Gate decisions will be implemented in a later increment.
      </p>
      <Card className="mt-8">
        <EmptyState
          icon={ScanLine}
          title="Gate experience reserved"
          description="No scanning, equipment lookup, or eligibility logic is active in this foundation."
        />
      </Card>
    </div>
  )
}
