import { useContext } from 'react'
import { SupervisorNotificationContext } from './supervisorNotificationContext'

export function useSupervisorNotifications() {
  const context = useContext(SupervisorNotificationContext)
  if (!context) {
    throw new Error(
      'useSupervisorNotifications must be used within a SupervisorNotificationProvider.',
    )
  }
  return context
}
