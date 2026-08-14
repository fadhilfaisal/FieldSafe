import { QrCode, ScanLine } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingState } from '../../components/feedback/LoadingState'
import { GateDecisionPanel } from '../../components/gate/GateDecisionPanel'
import {
  gateService,
  type GateCheckResult,
  type GateEquipmentOption,
} from '../../services/gateService'

export function GatePage() {
  const [equipment, setEquipment] = useState<GateEquipmentOption[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [result, setResult] = useState<GateCheckResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const loadEquipment = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const options = await gateService.getEquipmentOptions()
      setEquipment(options)
      setSelectedId((current) =>
        options.some((item) => item.equipment.id === current)
          ? current
          : options[0]?.equipment.id ?? '',
      )
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load equipment.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEquipment()
  }, [loadEquipment])

  async function simulateScan() {
    if (!selectedId) return
    setScanning(true)
    setError('')
    try {
      setResult(await gateService.checkEquipment(selectedId))
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : 'Unable to identify equipment.',
      )
    } finally {
      setScanning(false)
    }
  }

  function checkAnother() {
    setResult(null)
    setError('')
  }

  if (loading) return <LoadingState label="Preparing Gate equipment check…" />

  if (error && equipment.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={QrCode}
          title="Gate check unavailable"
          description={error}
          action={<Button onClick={() => void loadEquipment()}>Retry</Button>}
        />
      </Card>
    )
  }

  if (equipment.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={QrCode}
          title="No equipment available"
          description="There are no equipment records available for Gate identification."
        />
      </Card>
    )
  }

  if (result) {
    return <GateDecisionPanel result={result} onCheckAnother={checkAnother} />
  }

  const selected = equipment.find((item) => item.equipment.id === selectedId)

  return (
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Gate check</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Focused gate workspace</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
        Identify equipment to receive a current FieldSafe Gate decision. Camera scanning is simulated for this prototype.
      </p>

      <Card className="mx-auto mt-8 max-w-2xl p-5 text-left sm:p-7">
        <div className="relative mx-auto flex aspect-[5/3] max-w-md items-center justify-center rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/60">
          <span className="absolute left-5 top-5 size-10 border-l-4 border-t-4 border-brand-700" />
          <span className="absolute right-5 top-5 size-10 border-r-4 border-t-4 border-brand-700" />
          <span className="absolute bottom-5 left-5 size-10 border-b-4 border-l-4 border-brand-700" />
          <span className="absolute bottom-5 right-5 size-10 border-b-4 border-r-4 border-brand-700" />
          <div className="text-center">
            <ScanLine aria-hidden="true" className="mx-auto size-20 text-navy-900" strokeWidth={1.4} />
            <p className="mt-3 text-lg font-bold text-slate-900">{selected?.equipment.assetCode}</p>
            <p className="mt-1 text-xs text-slate-500">Demo scan target</p>
          </div>
        </div>

        <label htmlFor="gate-equipment-selection" className="mt-6 block text-sm font-bold text-slate-800">
          Demo equipment selection
        </label>
        <select
          id="gate-equipment-selection"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-600 focus:outline-none"
        >
          {equipment.map((item) => (
            <option key={item.equipment.id} value={item.equipment.id}>
              {item.equipment.assetCode} — {item.equipment.name}
            </option>
          ))}
        </select>

        {error ? <p className="mt-4 rounded-lg bg-danger-50 p-3 text-sm font-semibold text-danger-700" role="alert">{error}</p> : null}

        <Button size="lg" className="mt-5 w-full" onClick={() => void simulateScan()} disabled={scanning || !selected}>
          <QrCode aria-hidden="true" className="size-5" />
          {scanning ? 'Resolving equipment…' : 'Simulate Scan'}
        </Button>
      </Card>
    </div>
  )
}
