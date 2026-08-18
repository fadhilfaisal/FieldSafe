import { Bell, CheckCheck, ClipboardList, History } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { InspectorNotification } from '../../domain/models'
import { useInspectorNotifications } from '../../notifications/useInspectorNotifications'

function relativeTime(value: string) {
  const difference = Date.now() - Date.parse(value)
  const absolute = Math.abs(difference)
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (absolute < 60_000) return 'just now'
  if (absolute < 3_600_000) {
    return formatter.format(-Math.round(difference / 60_000), 'minute')
  }
  if (absolute < 86_400_000) {
    return formatter.format(-Math.round(difference / 3_600_000), 'hour')
  }
  return formatter.format(-Math.round(difference / 86_400_000), 'day')
}

export function InspectorNotificationCenter() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
  } = useInspectorNotifications()
  const [open, setOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function openNotification(notification: InspectorNotification) {
    try {
      if (notification.readAt === null) await markRead(notification.id)
      setActionError('')
      setOpen(false)
      if (notification.targetRoute) navigate(notification.targetRoute)
    } catch (notificationError) {
      setActionError(
        notificationError instanceof Error
          ? notificationError.message
          : 'Unable to open this notification.',
      )
    }
  }

  async function readAllNotifications() {
    try {
      await markAllRead()
      setActionError('')
    } catch (notificationError) {
      setActionError(
        notificationError instanceof Error
          ? notificationError.message
          : 'Unable to mark notifications as read.',
      )
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="relative flex size-10 items-center justify-center rounded-lg text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-controls="inspector-notification-panel"
      >
        <Bell aria-hidden="true" className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-0 top-0 flex min-w-4.5 -translate-y-1/4 translate-x-1/4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold leading-[1.125rem] text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section
          id="inspector-notification-panel"
          aria-label="Inspector notifications"
          className="fixed inset-x-3 top-17 z-50 flex max-h-[min(34rem,calc(100dvh-5.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[24rem]"
        >
          <div
            className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3"
            data-testid="notification-panel-header"
          >
            <div>
              <h2 className="text-sm font-bold text-slate-950">Notifications</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount} unread
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-brand-700 hover:bg-brand-50"
                onClick={() => void readAllNotifications()}
              >
                <CheckCheck aria-hidden="true" className="size-4" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            data-testid="notification-scroll-list"
          >
            {loading ? (
              <p className="p-5 text-sm text-slate-500">Loading notifications…</p>
            ) : null}
            {!loading && (error || actionError) ? (
              <p className="m-3 rounded-lg bg-danger-50 p-3 text-sm font-semibold text-danger-700" role="alert">
                {actionError || error}
              </p>
            ) : null}
            {!loading && !error && notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                No Inspector notifications.
              </p>
            ) : null}
            {notifications.map((notification) => {
              const Icon =
                notification.type === 'NEW_ASSIGNMENT'
                  ? ClipboardList
                  : History
              return (
                <button
                  type="button"
                  key={notification.id}
                  className={`block w-full cursor-pointer border-b border-slate-100 p-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:relative focus-visible:z-10 ${notification.readAt === null ? 'bg-brand-50/60' : 'bg-white'}`}
                  onClick={() => void openNotification(notification)}
                  aria-label={`Open ${notification.title}: ${notification.message}`}
                  data-notification-row={notification.type}
                  data-read={notification.readAt === null ? 'false' : 'true'}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${notification.readAt === null ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`text-sm ${notification.readAt === null ? 'font-bold text-slate-950' : 'font-semibold text-slate-700'}`}
                        >
                          {notification.title}
                        </h3>
                        {notification.readAt === null ? (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {notification.message}
                      </p>
                      <time
                        dateTime={notification.createdAt}
                        title={new Date(notification.createdAt).toLocaleString()}
                        className="mt-1 block text-[11px] font-medium text-slate-400"
                      >
                        {relativeTime(notification.createdAt)}
                      </time>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
