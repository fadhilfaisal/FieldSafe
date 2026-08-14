import { CircleHelp, CloudOff, Wifi } from 'lucide-react'
import { cn } from '../../utils/cn'

export type ConnectivityState = 'online' | 'offline' | 'unknown'

const content = {
  online: {
    label: 'Online',
    Icon: Wifi,
    className: 'text-success-700',
  },
  offline: {
    label: 'Offline',
    Icon: CloudOff,
    className: 'text-warning-800',
  },
  unknown: {
    label: 'Status unavailable',
    Icon: CircleHelp,
    className: 'text-slate-500',
  },
}

interface ConnectivityIndicatorProps {
  state?: ConnectivityState
  inverted?: boolean
  className?: string
}

export function ConnectivityIndicator({
  state = 'unknown',
  inverted = false,
  className,
}: ConnectivityIndicatorProps) {
  const { label, Icon, className: stateClassName } = content[state]

  return (
    <span
      className={cn(
        'inline-flex min-h-9 items-center gap-2 rounded-full px-2.5 text-xs font-semibold',
        inverted ? 'bg-white/10 text-white' : stateClassName,
        className,
      )}
      aria-label={`Connectivity: ${label}`}
    >
      <Icon aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
