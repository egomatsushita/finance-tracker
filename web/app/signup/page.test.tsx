import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import SignupPage from './page'

const { signup, push } = vi.hoisted(() => ({
  signup: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ signup }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

describe('SignupPage', () => {
  beforeEach(() => {
    signup.mockReset()
    push.mockReset()
  })

  it('renders username/email/password fields and a submit button', () => {
    render(<SignupPage />)
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
  })

  it('shows validation errors on empty submit and does not call signup', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('Username is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(signup).not.toHaveBeenCalled()
  })

  it('shows a validation error for an invalid email', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(screen.getByLabelText('Username'), 'newbie')
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(signup).not.toHaveBeenCalled()
  })

  it('calls signup and navigates to / on success', async () => {
    signup.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(screen.getByLabelText('Username'), 'newbie')
    await user.type(screen.getByLabelText('Email'), 'newbie@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
    expect(signup).toHaveBeenCalledWith('newbie', 'newbie@example.com', 'password123')
  })

  it('shows an inline conflict message when the username/email is taken and does not navigate', async () => {
    signup.mockRejectedValue(new ApiError(409, { detail: 'Username or email already taken' }))
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(screen.getByLabelText('Username'), 'newbie')
    await user.type(screen.getByLabelText('Email'), 'newbie@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('Username or email already taken')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('shows a generic message for non-409 errors', async () => {
    signup.mockRejectedValue(new Error('network down'))
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(screen.getByLabelText('Username'), 'newbie')
    await user.type(screen.getByLabelText('Email'), 'newbie@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('disables the submit button while signup is pending and prevents a second call', async () => {
    let resolveSignup: () => void = () => {}
    signup.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignup = resolve
        }),
    )
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(screen.getByLabelText('Username'), 'newbie')
    await user.type(screen.getByLabelText('Email'), 'newbie@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')

    const submitButton = screen.getByRole('button', { name: 'Sign up' })
    await user.click(submitButton)

    await waitFor(() => expect(submitButton).toBeDisabled())
    await user.click(submitButton)
    expect(signup).toHaveBeenCalledTimes(1)

    resolveSignup()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
  })

  it('links back to the login page', () => {
    render(<SignupPage />)
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login')
  })
})
