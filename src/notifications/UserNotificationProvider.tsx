import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from 'react'
import type { UserNotification } from '../domain/models'
import type { UserNotificationContextValue } from './notificationContext'

export interface UserNotificationService {
  getNotifications(userId: string): Promise<UserNotification[]>
  markRead(notificationId: string, userId: string): Promise<unknown>
  markAllRead(userId: string): Promise<unknown>
}

interface UserNotificationProviderProps {
  children: ReactNode
  userId: string | undefined
  service: UserNotificationService
  context: Context<UserNotificationContextValue | null>
  errorMessage: string
}

export function UserNotificationProvider({
  children,
  userId,
  service,
  context,
  errorMessage,
}: UserNotificationProviderProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([])
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
      setError(loadError instanceof Error ? loadError.message : errorMessage)
    } finally {
      setLoading(false)
    }
  }, [errorMessage, service, userId])

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

  const value = useMemo<UserNotificationContextValue>(
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
  const Provider = context.Provider

  return <Provider value={value}>{children}</Provider>
}
