import { ClipboardList, History } from 'lucide-react'
import { useInspectorNotifications } from '../../notifications/useInspectorNotifications'
import { NotificationCenter } from './NotificationCenter'

export function InspectorNotificationCenter() {
  return (
    <NotificationCenter
      state={useInspectorNotifications()}
      panelId="inspector-notification-panel"
      panelLabel="Inspector notifications"
      emptyMessage="No Inspector notifications."
      triggerClassName="text-blue-100 hover:bg-white/10 hover:text-white"
      iconFor={(notification) =>
        notification.type === 'NEW_ASSIGNMENT' ? ClipboardList : History
      }
    />
  )
}
