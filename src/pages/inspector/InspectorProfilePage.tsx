import { LogOut, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { PageHeader } from '../../components/common/PageHeader'
import { DemoResetControl } from '../../components/feedback/DemoResetControl'
import { useToast } from '../../components/feedback/useToast'
import { useConnectivity } from '../../connectivity/useConnectivity'
import { useInspectorNotifications } from '../../notifications/useInspectorNotifications'
import { getInitials } from '../../utils/identity'

export function InspectorProfilePage() {
  const { user, logout } = useAuth()
  const { refreshConnectivity } = useConnectivity()
  const { refresh: refreshNotifications } = useInspectorNotifications()
  const { showToast } = useToast()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your active FieldSafe demo identity and prototype controls."
      />

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white"
              aria-hidden="true"
            >
              {user ? getInitials(user.name) : <UserRound className="size-6" />}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-950">
                {user?.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{user?.role}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut aria-hidden="true" className="size-4" />
            Log out
          </Button>
        </div>
      </Card>

      <section aria-labelledby="demo-controls-title" className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
            Prototype only
          </p>
          <h2 id="demo-controls-title" className="mt-1 text-lg font-bold text-slate-950">
            Demo Controls
          </h2>
        </div>
        <DemoResetControl
          onResetSuccess={() => {
            void refreshConnectivity()
            void refreshNotifications()
            showToast({
              message: 'Demo data restored successfully.',
              tone: 'success',
            })
            navigate('/inspector', {
              replace: true,
              state: { demoDataReset: true },
            })
          }}
        />
      </section>
    </div>
  )
}
