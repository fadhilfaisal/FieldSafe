import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { InspectorNotification } from '../domain/models'
import {
  inspectorNotificationService,
  type InspectorNotificationService,
} from '../services/inspectorNotificationService'
import {
  InspectorNotificationContext,
  type InspectorNotificationContextValue,
} from './notificationContext'

interface InspectorNotificationProviderProps {
  children: ReactNode
  userId: string | undefined
  service?: InspectorNotificationService
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to load Inspector notifications.'
}

export function InspectorNotificationProvider({
  children,
  userId,
  service = inspectorNotificationService,
}: InspectorNotificationProviderProps) {
  const [notifications, setNotifications] = useState<InspectorNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setLoading(false)
      return
    }
    try {
      setNotifications(await service.getNotifications(userId))
      setError('')
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [service, userId])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  const markRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return
      await service.markRead(notificationId, userId)
      await refresh()
    },
    [refresh, service, userId],
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    await service.markAllRead(userId)
    await refresh()
  }, [refresh, service, userId])

  const value = useMemo<InspectorNotificationContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter(
        (notification) => notification.readAt === null,
      ).length,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
    }),
    [error, loading, markAllRead, markRead, notifications, refresh],
  )

  return (
    <InspectorNotificationContext.Provider value={value}>
      {children}
    </InspectorNotificationContext.Provider>
  )
}
