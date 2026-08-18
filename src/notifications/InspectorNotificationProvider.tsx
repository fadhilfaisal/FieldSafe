import type { ReactNode } from 'react'
import {
  inspectorNotificationService,
  type InspectorNotificationService,
} from '../services/inspectorNotificationService'
import { InspectorNotificationContext } from './notificationContext'
import { UserNotificationProvider } from './UserNotificationProvider'

interface InspectorNotificationProviderProps {
  children: ReactNode
  userId: string | undefined
  service?: InspectorNotificationService
}

export function InspectorNotificationProvider({
  children,
  userId,
  service = inspectorNotificationService,
}: InspectorNotificationProviderProps) {
  return (
    <UserNotificationProvider
      userId={userId}
      service={service}
      context={InspectorNotificationContext}
      errorMessage="Unable to load Inspector notifications."
    >
      {children}
    </UserNotificationProvider>
  )
}
