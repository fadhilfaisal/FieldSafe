import { createContext } from 'react'

export type ToastTone = 'success' | 'warning' | 'danger' | 'information'

export interface ToastInput {
  message: string
  tone?: ToastTone
}

export interface ToastMessage extends Required<ToastInput> {
  id: number
}

export interface ToastContextValue {
  toasts: ToastMessage[]
  showToast(toast: ToastInput): void
  dismissToast(id: number): void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
