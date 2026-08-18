import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react'
import { cn } from '../../utils/cn'
import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastTone,
} from './toastContext'

interface ToastProviderProps {
  children: ReactNode
  durationMilliseconds?: number
}

const toneClasses: Record<ToastTone, string> = {
  success: 'border-success-100 bg-success-50 text-success-700',
  warning: 'border-warning-100 bg-warning-50 text-warning-800',
  danger: 'border-danger-100 bg-danger-50 text-danger-700',
  information: 'border-brand-100 bg-brand-50 text-brand-700',
}

const toneIcons = {
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: XCircle,
  information: Info,
} satisfies Record<ToastTone, typeof Info>

export function ToastProvider({
  children,
  durationMilliseconds = 4_500,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastContextValue['toasts']>([])
  const nextId = useRef(1)

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current
      nextId.current += 1
      setToasts((current) =>
        current.concat({ id, message: toast.message, tone: toast.tone ?? 'information' }),
      )
      globalThis.setTimeout(() => dismissToast(id), durationMilliseconds)
    },
    [dismissToast, durationMilliseconds],
  )

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [dismissToast, showToast, toasts],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col items-end gap-2 sm:left-auto sm:w-96"
        aria-label="FieldSafe feedback"
      >
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone]
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg',
                toneClasses[toast.tone],
              )}
              role={toast.tone === 'danger' ? 'alert' : 'status'}
              aria-live={toast.tone === 'danger' ? 'assertive' : 'polite'}
            >
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <p className="min-w-0 flex-1 text-sm font-semibold leading-5">
                {toast.message}
              </p>
              <button
                type="button"
                className="-m-2 flex size-9 shrink-0 items-center justify-center rounded-lg opacity-70 hover:bg-black/5 hover:opacity-100"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
