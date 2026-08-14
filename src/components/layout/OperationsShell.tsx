import {
  type LucideIcon,
  LogOut,
  UserRound,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { getInitials } from '../../utils/identity'
import { cn } from '../../utils/cn'
import { ConnectivityIndicator } from '../common/ConnectivityIndicator'
import { BrandMark } from './BrandMark'

export interface OperationsNavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

interface OperationsShellProps {
  role: 'Supervisor' | 'Manager'
  navigation: OperationsNavItem[]
}

export function OperationsShell({ role, navigation }: OperationsShellProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-slate-100 p-3 lg:p-5">
      <div className="shell-surface mx-auto grid min-h-[calc(100dvh-1.5rem)] max-w-[1600px] grid-cols-[5rem_1fr] overflow-hidden rounded-2xl lg:min-h-[calc(100dvh-2.5rem)] lg:grid-cols-[16rem_1fr]">
        <aside className="flex flex-col bg-navy-950 text-white">
          <div className="flex min-h-18 items-center border-b border-white/10 px-3 lg:px-5">
            <div className="hidden lg:block">
              <BrandMark inverted />
            </div>
            <div className="mx-auto lg:hidden">
              <BrandMark compact inverted />
            </div>
          </div>

          <nav aria-label={`${role} navigation`} className="flex-1 space-y-1 p-2 lg:p-3">
            {navigation.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                key={label}
                to={to}
                end={end}
                title={label}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-12 items-center justify-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors lg:justify-start',
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-blue-100 hover:bg-white/8 hover:text-white',
                  )
                }
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-white/10 p-3 text-center text-[10px] text-blue-200 lg:text-left">
            <span className="hidden lg:inline">FieldSafe operations</span>
            <span className="lg:hidden">FS</span>
          </div>
        </aside>

        <div className="min-w-0 bg-slate-25">
          <header className="flex min-h-18 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-7">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Operations</p>
                <p className="text-xs text-slate-500">{role} workspace</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              <ConnectivityIndicator />
              <div className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-left">
                <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  {user ? (
                    <span className="text-xs font-bold" aria-hidden="true">
                      {getInitials(user.name)}
                    </span>
                  ) : (
                    <UserRound aria-hidden="true" className="size-5" />
                  )}
                </span>
                <span className="hidden sm:block">
                  <span className="block text-xs font-bold text-slate-900">{user?.name}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">{user?.role ?? role}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex size-11 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut aria-hidden="true" className="size-5" />
              </button>
            </div>
          </header>

          <main className="subtle-grid min-h-[calc(100%-4.5rem)] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
