import type { UserRole } from '../domain/models'

export type InteractiveRole = Exclude<UserRole, 'Technician'>

export interface DemoAccount {
  email: string
  role: InteractiveRole
}

export const DEMO_PASSWORD = 'demo123'

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { email: 'arjun.nair@fieldsafe.demo', role: 'Inspector' },
  { email: 'neha.patel@fieldsafe.demo', role: 'Inspector' },
  { email: 'priya.sharma@fieldsafe.demo', role: 'Supervisor' },
  { email: 'varun.mehta@fieldsafe.demo', role: 'Manager' },
]

export function isInteractiveRole(role: UserRole): role is InteractiveRole {
  return role !== 'Technician'
}
