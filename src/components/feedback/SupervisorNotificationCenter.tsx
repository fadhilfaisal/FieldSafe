import { ClipboardCheck } from 'lucide-react'
import { useSupervisorNotifications } from '../../notifications/useSupervisorNotifications'
import { NotificationCenter } from './NotificationCenter'

export function SupervisorNotificationCenter() {
  return (
    <NotificationCenter
      state={useSupervisorNotifications()}
      panelId="supervisor-notification-panel"
      panelLabel="Supervisor notifications"
      emptyMessage="No Supervisor notifications."
      triggerClassName="text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      iconFor={() => ClipboardCheck}
    />
  )
}
