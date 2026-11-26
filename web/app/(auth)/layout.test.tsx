import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { useAuthMock, replace } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

import AuthLayout from './layout'

describe('AuthLayout', () => {
  it('renders neither children nor a redirect while auth is loading', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true })
    render(
      <AuthLayout>
        <p>child</p>
      </AuthLayout>,
    )

    expect(screen.queryByText('child')).not.toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('redirects to / when loaded with an authenticated user', () => {
    useAuthMock.mockReturnValue({
      user: { id: '1', username: 'member', email: 'm@example.com', is_active: true },
      loading: false,
    })
    render(
      <AuthLayout>
        <p>child</p>
      </AuthLayout>,
    )

    expect(replace).toHaveBeenCalledWith('/')
    expect(screen.queryByText('child')).not.toBeInTheDocument()
  })

  it('renders children when loaded with no user', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false })
    render(
      <AuthLayout>
        <p>child</p>
      </AuthLayout>,
    )

    expect(screen.getByText('child')).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })
})
