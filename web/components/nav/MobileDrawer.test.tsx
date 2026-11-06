import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }))
vi.mock('next/navigation', () => ({ usePathname: usePathnameMock }))

import { MobileDrawer } from './MobileDrawer'

describe('MobileDrawer', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/')
  })

  it('renders nothing when closed', () => {
    render(<MobileDrawer isOpen={false} onClose={vi.fn()} onLogout={vi.fn()} />)
    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument()
  })

  it('renders nav links when open', () => {
    render(<MobileDrawer isOpen={true} onClose={vi.fn()} onLogout={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Transactions' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument()
  })

  it('calls onClose when a nav link is clicked', async () => {
    const onClose = vi.fn()
    render(<MobileDrawer isOpen={true} onClose={onClose} onLogout={vi.fn()} />)

    await userEvent.click(screen.getByRole('link', { name: 'Overview' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(<MobileDrawer isOpen={true} onClose={onClose} onLogout={vi.fn()} />)

    await userEvent.click(screen.getByTestId('mobile-drawer-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    render(<MobileDrawer isOpen={true} onClose={onClose} onLogout={vi.fn()} />)

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onLogout when the logout button is clicked', async () => {
    const onLogout = vi.fn()
    render(<MobileDrawer isOpen={true} onClose={vi.fn()} onLogout={onLogout} />)

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
