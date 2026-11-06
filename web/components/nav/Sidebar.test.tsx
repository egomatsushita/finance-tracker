import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }))
vi.mock('next/navigation', () => ({ usePathname: usePathnameMock }))

import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('marks the link matching the current pathname as active', () => {
    usePathnameMock.mockReturnValue('/transactions')
    render(<Sidebar onLogout={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveAttribute('aria-current')
  })

  it('renders all nav links', () => {
    usePathnameMock.mockReturnValue('/')
    render(<Sidebar onLogout={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '/transactions')
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
  })

  it('calls onLogout when the logout button is clicked', async () => {
    usePathnameMock.mockReturnValue('/')
    const onLogout = vi.fn()
    render(<Sidebar onLogout={onLogout} />)

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
