import { createContext } from 'react'
import type { InspectorNotification } from '../domain/models'

export interface InspectorNotificationContextValue {
  notifications: InspectorNotification[]
  unreadCount: number
  loading: boolean
  error: string
  refresh(): Promise<void>
  markRead(notificationId: string): Promise<void>
  markAllRead(): Promise<void>
}

export const InspectorNotificationContext =
  createContext<InspectorNotificationContextValue | null>(null)
