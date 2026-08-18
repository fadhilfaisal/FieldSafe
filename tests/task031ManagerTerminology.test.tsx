// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '../src/app/router'
import { AuthProvider } from '../src/auth/AuthProvider'
import { authService } from '../src/auth/authService'
import { DEMO_PASSWORD } from '../src/auth/demoCredentials'

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('TASK-031 Manager Compliance terminology', () => {
  it('uses Compliance for navigation while retaining Inspection Pass Rate as the metric', async () => {
    await authService.login({
      email: 'varun.mehta@fieldsafe.demo',
      password: DEMO_PASSWORD,
    })
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/manager'],
    })
    render(
      <AuthProvider service={authService}>
        <RouterProvider router={router} />
      </AuthProvider>,
    )
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Manager Overview' })
    const complianceHeading = await screen.findByRole('heading', {
      name: 'Compliance',
      level: 3,
    })
    const complianceCard = complianceHeading.closest('a')!
    expect(screen.queryByRole('heading', { name: 'Pass Rate' })).toBeNull()

    await user.click(complianceCard)
    expect(router.state.location.pathname).toBe('/manager/compliance')
    expect(await screen.findByRole('heading', { name: 'Compliance' })).toBeTruthy()
    expect(screen.getByText('Inspection Pass Rate')).toBeTruthy()
  })
})
