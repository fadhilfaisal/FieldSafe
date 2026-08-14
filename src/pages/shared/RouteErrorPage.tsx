import { AlertTriangle, Home, RotateCw } from 'lucide-react'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '../../components/common/Button'
import { BrandMark } from '../../components/layout/BrandMark'

function getErrorDescription(error: unknown) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return 'The requested FieldSafe page is not available.'
  }
  return 'FieldSafe could not safely display this page. No operational decision has been made.'
}

export function RouteErrorPage() {
  const error = useRouteError()

  return (
    <main className="subtle-grid flex min-h-dvh items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-card sm:p-10" role="alert">
        <BrandMark />
        <span className="mx-auto mt-8 flex size-16 items-center justify-center rounded-full bg-danger-50 text-danger-700">
          <AlertTriangle aria-hidden="true" className="size-8" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-danger-700">Application error</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">FieldSafe could not open this page</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">{getErrorDescription(error)}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            <RotateCw aria-hidden="true" className="size-4" />
            Try Again
          </Button>
          <Link to="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-600">
            <Home aria-hidden="true" className="size-4" />
            Return to FieldSafe
          </Link>
        </div>
      </section>
    </main>
  )
}
