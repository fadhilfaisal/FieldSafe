import type { User } from '../domain/models'
import type { FieldSafeRepository } from '../repositories/fieldSafeRepository'
import { fieldSafeRepository } from '../repositories'
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  isInteractiveRole,
  type InteractiveRole,
} from './demoCredentials'
import { sessionStore, type SessionStore } from './sessionStore'

export type AuthenticatedUser = User & { role: InteractiveRole }

export interface LoginCredentials {
  email: string
  password: string
}

export class AuthenticationError extends Error {
  constructor() {
    super('The email or password is incorrect. Use one of the demo accounts below.')
    this.name = 'AuthenticationError'
  }
}

function asAuthenticatedUser(user: User): AuthenticatedUser | null {
  return user.isActive && isInteractiveRole(user.role)
    ? (user as AuthenticatedUser)
    : null
}

export class AuthService {
  constructor(
    private readonly repository: FieldSafeRepository,
    private readonly sessions: SessionStore,
  ) {}

  async login({ email, password }: LoginCredentials) {
    const normalizedEmail = email.trim().toLowerCase()
    const approvedAccount = DEMO_ACCOUNTS.find(
      (account) => account.email === normalizedEmail,
    )

    if (!approvedAccount || password !== DEMO_PASSWORD) {
      throw new AuthenticationError()
    }

    const users = await this.repository.getUsers()
    const user = users.find(
      (candidate) =>
        candidate.email.toLowerCase() === normalizedEmail &&
        candidate.role === approvedAccount.role,
    )
    const authenticatedUser = user ? asAuthenticatedUser(user) : null

    if (!authenticatedUser) {
      throw new AuthenticationError()
    }

    this.sessions.saveUserId(authenticatedUser.id)
    return authenticatedUser
  }

  async restoreSession() {
    const userId = this.sessions.getUserId()
    if (!userId) return null

    const user = (await this.repository.getUsers()).find(
      (candidate) => candidate.id === userId,
    )
    const authenticatedUser = user ? asAuthenticatedUser(user) : null

    if (!authenticatedUser) {
      this.sessions.clear()
      return null
    }

    return authenticatedUser
  }

  logout() {
    this.sessions.clear()
  }
}

export const authService = new AuthService(fieldSafeRepository, sessionStore)
