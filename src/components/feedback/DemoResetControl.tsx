import { RotateCcw, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { resetDemoData as resetStoredDemoData } from '../../services/demoDataService'
import { Button } from '../common/Button'
import { Card } from '../common/Card'

interface DemoResetControlProps {
  onResetSuccess(): void
  resetDemoData?: () => Promise<void>
}

export function DemoResetControl({
  onResetSuccess,
  resetDemoData = resetStoredDemoData,
}: DemoResetControlProps) {
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const resettingRef = useRef(false)

  useEffect(() => {
    if (!confirming) return

    const trigger = triggerRef.current
    cancelRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !resettingRef.current) {
        setConfirming(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (trigger?.isConnected) trigger.focus()
    }
  }, [confirming])

  function openConfirmation() {
    setError('')
    setConfirming(true)
  }

  function cancel() {
    if (resettingRef.current) return
    setConfirming(false)
  }

  async function confirmReset() {
    setResetting(true)
    resettingRef.current = true
    setError('')

    try {
      await resetDemoData()
      resettingRef.current = false
      setResetting(false)
      setConfirming(false)
      onResetSuccess()
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'Unable to restore demo data. Please try again.',
      )
      resettingRef.current = false
      setResetting(false)
    }
  }

  return (
    <>
      <Card className="border-danger-100 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger-50 text-danger-700">
            <RotateCcw aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-950">Reset Demo Data</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Restore all sample inspections, equipment states, defects and
              corrective actions to their original demo values.
            </p>
            <Button
              ref={triggerRef}
              variant="danger"
              className="mt-4 w-full sm:w-auto"
              onClick={openConfirmation}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Reset Demo Data
            </Button>
            {error && !confirming ? (
              <p className="mt-3 text-sm font-semibold text-danger-700" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      {confirming ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-demo-title"
            aria-describedby="reset-demo-description"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-danger-50 text-danger-700">
              <TriangleAlert aria-hidden="true" className="size-6" />
            </span>
            <h2 id="reset-demo-title" className="mt-4 text-xl font-bold text-slate-950">
              Reset FieldSafe demo data?
            </h2>
            <p id="reset-demo-description" className="mt-2 text-sm leading-6 text-slate-600">
              All inspection, defect, corrective-action and equipment-state
              changes made during this demo will be discarded and the original
              sample dataset will be restored.
            </p>
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
              Your current login session will remain active.
            </p>
            {error ? (
              <p className="mt-3 rounded-lg bg-danger-50 p-3 text-sm font-semibold text-danger-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                ref={cancelRef}
                variant="secondary"
                onClick={cancel}
                disabled={resetting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => void confirmReset()}
                disabled={resetting}
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                {resetting ? 'Resetting demo data…' : 'Reset Demo Data'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
