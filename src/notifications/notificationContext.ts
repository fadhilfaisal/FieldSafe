import { createContext } from 'react'
import type { UserNotification } from '../domain/models'

export interface UserNotificationContextValue {
  notifications: UserNotification[]
  unreadCount: number
  loading: boolean
  error: string
  refresh(): Promise<void>
  markRead(notificationId: string): Promise<void>
  markAllRead(): Promise<void>
}

export type InspectorNotificationContextValue = UserNotificationContextValue

export const InspectorNotificationContext =
  createContext<InspectorNotificationContextValue | null>(null)
