import { createContext } from 'react'
import type { UserNotificationContextValue } from './notificationContext'

export const SupervisorNotificationContext =
  createContext<UserNotificationContextValue | null>(null)
