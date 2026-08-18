import type { ReactNode } from 'react'
import {
  supervisorNotificationService,
  type SupervisorNotificationService,
} from '../services/supervisorNotificationService'
import { SupervisorNotificationContext } from './supervisorNotificationContext'
import { UserNotificationProvider } from './UserNotificationProvider'

interface SupervisorNotificationProviderProps {
  children: ReactNode
  userId: string | undefined
  service?: SupervisorNotificationService
}

export function SupervisorNotificationProvider({
  children,
  userId,
  service = supervisorNotificationService,
}: SupervisorNotificationProviderProps) {
  return (
    <UserNotificationProvider
      userId={userId}
      service={service}
      context={SupervisorNotificationContext}
      errorMessage="Unable to load Supervisor notifications."
    >
      {children}
    </UserNotificationProvider>
  )
}
