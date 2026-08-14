import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { BrandMark } from '../../components/layout/BrandMark'

export function LoginPage() {
  return (
    <main className="subtle-grid flex min-h-dvh items-center justify-center bg-slate-100 p-4 sm:p-8">
      <section className="shell-surface grid w-full max-w-4xl overflow-hidden rounded-2xl lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative hidden min-h-[34rem] overflow-hidden bg-navy-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-20 size-72 rounded-full border-[3rem] border-brand-500/15" />
          <div className="absolute -bottom-36 -left-24 size-80 rounded-full border-[4rem] border-white/5" />
          <BrandMark inverted />
          <div className="relative">
            <ShieldCheck aria-hidden="true" className="mb-5 size-10 text-blue-300" />
            <p className="text-3xl font-bold leading-tight">Safer field operations start with clear decisions.</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">
              A dependable workspace for inspections, equipment safety, and gate operations.
            </p>
          </div>
        </div>

        <div className="flex min-h-[34rem] flex-col justify-center bg-white p-7 sm:p-12">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
            Welcome to FieldSafe
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Application foundation</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600">
            Authentication will be implemented in a later increment. This route currently demonstrates the entry-point visual foundation only.
          </p>
          <div className="mt-8 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm leading-6 text-brand-700">
            No credentials, session state, or browser persistence are included in this foundation.
          </div>
          <Link
            to="/inspector"
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            View application shell
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
