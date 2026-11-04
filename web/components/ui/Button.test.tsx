import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Sign in</Button>)
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Sign in</Button>)
    screen.getByText('Sign in').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled and does not fire onClick when isLoading', () => {
    const onClick = vi.fn()
    render(
      <Button isLoading onClick={onClick}>
        Sign in
      </Button>,
    )
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    button.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is disabled and does not fire onClick when disabled', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Sign in
      </Button>,
    )
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    button.click()
    expect(onClick).not.toHaveBeenCalled()
  })
})
