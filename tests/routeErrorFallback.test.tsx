// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '../src/app/router'
import { RouteErrorPage } from '../src/pages/shared/RouteErrorPage'

function BrokenRoute(): never {
  throw new Error('Test route render failure')
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('FieldSafe route error fallback', () => {
  it('replaces React Router generic errors with a branded safe state', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const router = createMemoryRouter(
      [
        {
          path: '/broken',
          element: <BrokenRoute />,
          errorElement: <RouteErrorPage />,
        },
      ],
      { initialEntries: ['/broken'] },
    )

    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole('heading', {
        name: 'FieldSafe could not open this page',
      }),
    ).toBeTruthy()
    expect(screen.getByText(/No operational decision has been made/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Return to FieldSafe' }).getAttribute('href'),
    ).toBe('/')
    consoleError.mockRestore()
  })

  it('configures the FieldSafe fallback on every top-level application route', () => {
    expect(appRoutes.length).toBeGreaterThan(0)
    expect(appRoutes.every((route) => route.errorElement)).toBe(true)
  })
})
