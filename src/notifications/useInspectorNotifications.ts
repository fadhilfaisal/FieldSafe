import { useContext } from 'react'
import { InspectorNotificationContext } from './notificationContext'

export function useInspectorNotifications() {
  const context = useContext(InspectorNotificationContext)
  if (!context) {
    throw new Error(
      'useInspectorNotifications must be used within an InspectorNotificationProvider.',
    )
  }
  return context
}
