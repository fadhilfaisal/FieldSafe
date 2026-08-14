import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService as defaultAuthService, type AuthService, type AuthenticatedUser, type LoginCredentials } from './authService'
import { AuthContext, type AuthContextValue } from './authContext'

interface AuthProviderProps {
  children: ReactNode
  service?: AuthService
}

export function AuthProvider({
  children,
  service = defaultAuthService,
}: AuthProviderProps) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)

  useEffect(() => {
    let active = true

    void service
      .restoreSession()
      .then((restoredUser) => {
        if (!active) return
        setUser(restoredUser)
        setStatus(restoredUser ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setStatus('unauthenticated')
      })

    return () => {
      active = false
    }
  }, [service])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async login(credentials: LoginCredentials) {
        const authenticatedUser = await service.login(credentials)
        setUser(authenticatedUser)
        setStatus('authenticated')
        return authenticatedUser
      },
      logout() {
        service.logout()
        setUser(null)
        setStatus('unauthenticated')
      },
    }),
    [service, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
