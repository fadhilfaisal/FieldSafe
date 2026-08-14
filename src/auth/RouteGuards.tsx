import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { BrandMark } from '../components/layout/BrandMark'
import { getRoleLandingPath, isRoleAuthorized } from './authorization'
import type { InteractiveRole } from './demoCredentials'
import { useAuth } from './useAuth'

function AuthLoadingScreen() {
  return (
    <main className="subtle-grid flex min-h-dvh items-center justify-center bg-slate-100 p-6">
      <div className="flex flex-col items-center gap-4 text-slate-600" role="status">
        <BrandMark />
        <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-brand-700" />
        <span className="text-sm font-medium">Restoring session…</span>
      </div>
    </main>
  )
}

interface RequireRoleProps {
  allowedRoles: readonly InteractiveRole[]
}

export function RequireRole({ allowedRoles }: RequireRoleProps) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <AuthLoadingScreen />

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isRoleAuthorized(user.role, allowedRoles)) {
    return <Navigate to={getRoleLandingPath(user.role)} replace />
  }

  return <Outlet />
}

export function LoginRoute() {
  const { status, user } = useAuth()

  if (status === 'loading') return <AuthLoadingScreen />
  if (user) return <Navigate to={getRoleLandingPath(user.role)} replace />

  return <Outlet />
}
