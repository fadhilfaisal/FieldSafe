import { createContext } from 'react'
import type { AuthenticatedUser, LoginCredentials } from './authService'

export interface AuthContextValue {
  status: 'loading' | 'authenticated' | 'unauthenticated'
  user: AuthenticatedUser | null
  login(credentials: LoginCredentials): Promise<AuthenticatedUser>
  logout(): void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
