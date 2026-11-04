import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import LoginPage from './page'

const { login, push } = vi.hoisted(() => ({
  login: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ login }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset()
    push.mockReset()
  })

  it('renders username/password fields and a submit button', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows validation errors on empty submit and does not call login', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Username is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('calls login and navigates to / on success', async () => {
    login.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Username'), 'member')
    await user.type(screen.getByLabelText('Password'), 'member')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
    expect(login).toHaveBeenCalledWith('member', 'member')
  })

  it('shows an inline 401 message on bad credentials and does not navigate', async () => {
    login.mockRejectedValue(new ApiError(401, { detail: 'Incorrect username or password' }))
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Username'), 'member')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Incorrect username or password')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('shows a generic message for non-401 errors', async () => {
    login.mockRejectedValue(new Error('network down'))
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Username'), 'member')
    await user.type(screen.getByLabelText('Password'), 'member')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('disables the submit button while login is pending and prevents a second call', async () => {
    let resolveLogin: () => void = () => {}
    login.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve
        }),
    )
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Username'), 'member')
    await user.type(screen.getByLabelText('Password'), 'member')

    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    await user.click(submitButton)

    await waitFor(() => expect(submitButton).toBeDisabled())
    await user.click(submitButton)
    expect(login).toHaveBeenCalledTimes(1)

    resolveLogin()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
  })
})
