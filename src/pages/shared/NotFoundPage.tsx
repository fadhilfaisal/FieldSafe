import { ArrowLeft, MapPinOff } from 'lucide-react'
import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-6 text-center">
      <div>
        <span className="mx-auto flex size-14 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <MapPinOff aria-hidden="true" className="size-7" />
        </span>
        <p className="mt-6 text-sm font-bold text-brand-700">404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">The requested FieldSafe route is not available.</p>
        <Link
          to="/login"
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white hover:bg-brand-600"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Return to login
        </Link>
      </div>
    </main>
  )
}
