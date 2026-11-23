import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfileClient } from './ProfileClient'

const { useAuthMock, useUpdateProfile, mutateAsync, showToast, refreshUser, MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    status: number
    body: { detail: string }
    constructor(status: number, detail: string) {
      super(detail)
      this.status = status
      this.body = { detail }
    }
  }
  return {
    useAuthMock: vi.fn(),
    useUpdateProfile: vi.fn(),
    mutateAsync: vi.fn(),
    showToast: vi.fn(),
    refreshUser: vi.fn(),
    MockApiError,
  }
})

vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/lib/queries', () => ({ useUpdateProfile }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast }) }))
vi.mock('@/lib/api', () => ({ ApiError: MockApiError }))

const user = {
  id: 'u1',
  username: 'member',
  email: 'member@example.com',
  is_active: true,
  created_at: '2024-03-05T00:00:00Z',
  updated_at: '2024-03-05T00:00:00Z',
}

describe('ProfileClient', () => {
  beforeEach(() => {
    useAuthMock.mockReset().mockReturnValue({ user, refreshUser })
    useUpdateProfile.mockReset().mockReturnValue({ mutateAsync })
    mutateAsync.mockReset().mockResolvedValue({ ...user })
    showToast.mockReset()
    refreshUser.mockReset().mockResolvedValue(user)
  })

  it('renders the current user details and member-since in view mode', () => {
    render(<ProfileClient />)
    expect(screen.getByText('member')).toBeInTheDocument()
    expect(screen.getByText('member@example.com')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Mar 5, 2024')).toBeInTheDocument()
  })

  it('shows a pre-filled form when Edit is clicked, and Cancel restores view mode', async () => {
    const userEventInstance = userEvent.setup()
    render(<ProfileClient />)

    await userEventInstance.click(screen.getByText('Edit'))
    expect(screen.getByLabelText('Username')).toHaveValue('member')
    expect(screen.getByLabelText('Email')).toHaveValue('member@example.com')

    await userEventInstance.click(screen.getByText('Cancel'))
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
    expect(screen.getByText('member')).toBeInTheDocument()
  })

  it('submits only the changed fields and omits a blank password', async () => {
    const userEventInstance = userEvent.setup()
    render(<ProfileClient />)

    await userEventInstance.click(screen.getByText('Edit'))
    await userEventInstance.clear(screen.getByLabelText('Username'))
    await userEventInstance.type(screen.getByLabelText('Username'), 'renamed')
    await userEventInstance.click(screen.getByText('Save'))

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ id: 'u1', payload: { username: 'renamed' } }),
    )
    expect(refreshUser).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('Profile updated')
  })

  it('blocks submission when the new password and confirmation do not match', async () => {
    const userEventInstance = userEvent.setup()
    render(<ProfileClient />)

    await userEventInstance.click(screen.getByText('Edit'))
    await userEventInstance.type(screen.getByLabelText('New password'), 'password123')
    await userEventInstance.type(screen.getByLabelText('Confirm new password'), 'different123')
    await userEventInstance.click(screen.getByText('Save'))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('shows a reload message instead of blanking the page when refreshUser fails after save', async () => {
    refreshUser.mockResolvedValue(null)
    const userEventInstance = userEvent.setup()
    render(<ProfileClient />)

    await userEventInstance.click(screen.getByText('Edit'))
    await userEventInstance.clear(screen.getByLabelText('Username'))
    await userEventInstance.type(screen.getByLabelText('Username'), 'renamed')
    await userEventInstance.click(screen.getByText('Save'))

    expect(await screen.findByText(/profile saved, but could not refresh/i)).toBeInTheDocument()
    expect(showToast).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
  })

  it('shows an "already taken" error on 409 and stays in edit mode', async () => {
    mutateAsync.mockRejectedValue(new MockApiError(409, 'conflict'))
    const userEventInstance = userEvent.setup()
    render(<ProfileClient />)

    await userEventInstance.click(screen.getByText('Edit'))
    await userEventInstance.clear(screen.getByLabelText('Email'))
    await userEventInstance.type(screen.getByLabelText('Email'), 'taken@example.com')
    await userEventInstance.click(screen.getByText('Save'))

    expect(await screen.findByText('Username or email already taken')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })
})
