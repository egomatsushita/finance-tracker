import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { useAuthMock, replace } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/',
}))
vi.mock('@/components/nav/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
}))

import AppLayout from './layout'

describe('AppLayout', () => {
  it('renders a loading skeleton and not children while auth is loading', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true })
    render(
      <AppLayout>
        <p>child</p>
      </AppLayout>,
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('child')).not.toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('redirects to /login when loaded with no user', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false })
    render(
      <AppLayout>
        <p>child</p>
      </AppLayout>,
    )

    expect(replace).toHaveBeenCalledWith('/login')
    expect(screen.queryByText('child')).not.toBeInTheDocument()
  })

  it('renders the app shell and children once loaded with a user', () => {
    useAuthMock.mockReturnValue({
      user: { id: '1', username: 'member', email: 'm@example.com', is_active: true },
      loading: false,
    })
    render(
      <AppLayout>
        <p>child</p>
      </AppLayout>,
    )

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByText('child')).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })
})
