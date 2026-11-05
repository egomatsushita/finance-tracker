import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './auth'

const { getWithAuthHandling, loginRequest, logoutRequest, resetUnauthorizedGuard } = vi.hoisted(
  () => ({
    getWithAuthHandling: vi.fn(),
    loginRequest: vi.fn(),
    logoutRequest: vi.fn(),
    resetUnauthorizedGuard: vi.fn(),
  }),
)

vi.mock('./api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number) {
      super('error')
      this.status = status
    }
  },
  getWithAuthHandling,
  loginRequest,
  logoutRequest,
  resetUnauthorizedGuard,
}))

function Probe() {
  const { user, loading, login, logout } = useAuth()
  const [loginError, setLoginError] = useState<string | null>(null)
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.username : 'none'}</span>
      <span data-testid="login-error">{loginError ?? ''}</span>
      <button
        onClick={() => {
          setLoginError(null)
          login('member', 'member').catch((err: Error) => setLoginError(err.message))
        }}
      >
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    getWithAuthHandling.mockReset()
    loginRequest.mockReset()
    logoutRequest.mockReset()
    resetUnauthorizedGuard.mockReset()
    vi.spyOn(window.localStorage.__proto__, 'setItem')
  })

  it('hydrates the user purely from /users/me, no token read needed', async () => {
    getWithAuthHandling.mockResolvedValue({ id: '1', username: 'member' })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('user').textContent).toBe('member')
  })

  it('settles to logged-out when hydration fails, without throwing', async () => {
    getWithAuthHandling.mockRejectedValue(new Error('401'))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  it('login never writes to localStorage (no client-readable token)', async () => {
    getWithAuthHandling.mockResolvedValue({ id: '1', username: 'member' })
    loginRequest.mockResolvedValue({ detail: 'ok' })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

    screen.getByText('login').click()

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('member'))
    expect(window.localStorage.setItem).not.toHaveBeenCalled()
  })

  it('login rejects when post-login hydration fails, leaving user logged out', async () => {
    getWithAuthHandling.mockResolvedValue(null)
    loginRequest.mockResolvedValue({ detail: 'ok' })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))

    screen.getByText('login').click()

    await waitFor(() => expect(screen.getByTestId('login-error').textContent).not.toBe(''))
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  it('logout calls logoutRequest and clears the user', async () => {
    getWithAuthHandling.mockResolvedValue({ id: '1', username: 'member' })
    logoutRequest.mockResolvedValue(undefined)
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('member'))

    screen.getByText('logout').click()

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'))
    expect(logoutRequest).toHaveBeenCalledTimes(1)
  })
})
