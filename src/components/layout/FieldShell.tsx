import {
  History,
  Home,
  LogOut,
  QrCode,
  UserRound,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { ConnectivityProvider } from '../../connectivity/ConnectivityProvider'
import { getInitials } from '../../utils/identity'
import { cn } from '../../utils/cn'
import { ConnectivityControl } from '../inspection/ConnectivityControl'
import { ConnectivityNotice } from '../inspection/ConnectivityNotice'
import { BrandMark } from './BrandMark'

const navigation = [
  { label: 'Home', to: '/inspector', icon: Home, end: true },
  { label: 'Scan', to: '/inspector/scan', icon: QrCode },
  { label: 'History', to: '/inspector/history', icon: History },
  { label: 'Profile', to: '/inspector/profile', icon: UserRound },
]

export function FieldShell() {
  return (
    <ConnectivityProvider>
      <FieldShellContent />
    </ConnectivityProvider>
  )
}

function FieldShellContent() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-slate-100 sm:p-4 lg:p-6">
      <div className="shell-surface mx-auto flex min-h-dvh max-w-5xl flex-col overflow-hidden sm:min-h-[calc(100dvh-2rem)] sm:rounded-2xl lg:min-h-[calc(100dvh-3rem)]">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-navy-800 bg-navy-900 px-4 text-white sm:px-6">
          <BrandMark inverted />
          <div className="flex items-center gap-2">
            <ConnectivityControl />
            <div className="flex min-h-10 items-center gap-2 border-l border-white/15 pl-3">
              <span className="hidden text-right sm:block">
                <span className="block text-xs font-semibold text-white">{user?.name}</span>
                <span className="mt-0.5 block text-[10px] text-blue-100">{user?.role}</span>
              </span>
              <span
                className="flex size-9 items-center justify-center rounded-full bg-white/12 text-xs font-bold"
                aria-hidden="true"
              >
                {user ? getInitials(user.name) : <UserRound className="size-5" />}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex size-10 items-center justify-center rounded-lg text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut aria-hidden="true" className="size-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="subtle-grid flex-1 overflow-y-auto bg-slate-25 px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-28 lg:px-10">
          <ConnectivityNotice />
          <Outlet />
        </main>

        <nav
          aria-label="Inspector navigation"
          className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-5xl grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:bottom-4 sm:rounded-b-2xl lg:bottom-6"
        >
          {navigation.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                )
              }
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
