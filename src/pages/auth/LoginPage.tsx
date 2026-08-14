import { AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../auth/demoCredentials'
import { getRoleLandingPath } from '../../auth/authorization'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/common/Button'
import { BrandMark } from '../../components/layout/BrandMark'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const user = await login({ email, password })
      navigate(getRoleLandingPath(user.role), { replace: true })
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Unable to sign in. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function selectDemoAccount(accountEmail: string) {
    setEmail(accountEmail)
    setPassword(DEMO_PASSWORD)
    setError('')
  }

  return (
    <main className="subtle-grid flex min-h-dvh items-center justify-center bg-slate-100 p-4 sm:p-8">
      <section className="shell-surface grid w-full max-w-5xl overflow-hidden rounded-2xl lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative hidden min-h-[42rem] overflow-hidden bg-navy-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-20 size-72 rounded-full border-[3rem] border-brand-500/15" />
          <div className="absolute -bottom-36 -left-24 size-80 rounded-full border-[4rem] border-white/5" />
          <BrandMark inverted />
          <div className="relative">
            <ShieldCheck aria-hidden="true" className="mb-5 size-10 text-blue-300" />
            <p className="text-3xl font-bold leading-tight">
              Safer field operations start with clear decisions.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">
              A dependable workspace for inspections, equipment safety, and gate operations.
            </p>
          </div>
        </div>

        <div className="flex min-h-[42rem] flex-col justify-center bg-white p-7 sm:p-10 lg:p-12">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
            Welcome to FieldSafe
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Sign in to FieldSafe
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Use a demo account to open the appropriate role workspace.
          </p>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="text-sm font-semibold text-slate-800">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
                className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-950 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:outline-none"
                placeholder="name@fieldsafe.demo"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-semibold text-slate-800">
                Password
              </label>
              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 pr-12 text-sm text-slate-950 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:outline-none"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-800"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="size-5" />
                  ) : (
                    <Eye aria-hidden="true" className="size-5" />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <div
                id="login-error"
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm leading-5 text-danger-700"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign In'}
              {!isSubmitting ? <ArrowRight aria-hidden="true" className="size-4" /> : null}
            </Button>
          </form>

          <section className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="demo-accounts-title">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="demo-accounts-title" className="text-sm font-bold text-slate-900">
                Demo Accounts
              </h2>
              <p className="text-xs text-slate-500">
                Shared password: <code className="font-bold text-slate-700">{DEMO_PASSWORD}</code>
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => selectDemoAccount(account.email)}
                  className="min-h-12 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-brand-500 hover:bg-brand-50"
                  aria-label={`Use ${account.role} demo account for ${account.email}`}
                >
                  <span className="block text-xs font-bold text-brand-700">{account.role}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-600">{account.email}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
