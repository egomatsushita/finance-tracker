import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from './TopBar'

describe('TopBar', () => {
  it('calls onToggle when the hamburger button is clicked', async () => {
    const onToggle = vi.fn()
    render(<TopBar isOpen={false} onToggle={onToggle} />)

    await userEvent.click(screen.getByRole('button', { name: /navigation/i }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('reflects open state via aria-expanded', () => {
    render(<TopBar isOpen={true} onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: /navigation/i })).toHaveAttribute('aria-expanded', 'true')
  })
})
