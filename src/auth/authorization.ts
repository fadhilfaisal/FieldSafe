import type { InteractiveRole } from './demoCredentials'

export function getRoleLandingPath(role: InteractiveRole) {
  switch (role) {
    case 'Inspector':
      return '/inspector'
    case 'Supervisor':
      return '/supervisor'
    case 'Manager':
      return '/manager'
  }
}

export function isRoleAuthorized(
  role: InteractiveRole,
  allowedRoles: readonly InteractiveRole[],
) {
  return allowedRoles.includes(role)
}
