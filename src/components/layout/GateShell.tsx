import { Link, Outlet } from 'react-router'
import { BrandMark } from './BrandMark'

export function GateShell() {
  return (
    <div className="min-h-dvh bg-slate-100 p-0 sm:p-4 lg:p-6">
      <div className="shell-surface mx-auto flex min-h-dvh max-w-6xl flex-col overflow-hidden sm:min-h-[calc(100dvh-2rem)] sm:rounded-2xl lg:min-h-[calc(100dvh-3rem)]">
        <header className="flex min-h-18 items-center justify-between gap-4 border-b border-navy-800 bg-navy-900 px-5 text-white sm:px-7">
          <div className="flex items-center gap-4">
            <BrandMark inverted />
            <span className="hidden h-7 w-px bg-white/20 sm:block" />
            <span className="hidden text-sm font-bold tracking-wide text-blue-100 sm:block">
              Gate
            </span>
          </div>
          <Link to="/login" className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold text-blue-100 hover:bg-white/10 hover:text-white">
            Return to Login
          </Link>
        </header>
        <main className="subtle-grid flex flex-1 items-center justify-center bg-slate-25 p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-3xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
