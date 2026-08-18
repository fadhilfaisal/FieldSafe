import { useEffect, useRef } from 'react'
import { useConnectivity } from '../../connectivity/useConnectivity'
import { useInspectorNotifications } from '../../notifications/useInspectorNotifications'
import { useToast } from './useToast'

export function InspectorSyncFeedback() {
  const { syncActivity } = useConnectivity()
  const { refresh } = useInspectorNotifications()
  const { showToast } = useToast()
  const previousActivity = useRef(syncActivity)

  useEffect(() => {
    if (
      syncActivity === 'SYNCED' &&
      previousActivity.current !== 'SYNCED'
    ) {
      showToast({ message: 'Offline inspections synced.', tone: 'success' })
      void refresh()
    }
    previousActivity.current = syncActivity
  }, [refresh, showToast, syncActivity])

  return null
}
