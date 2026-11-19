import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('disables Previous on the first page', () => {
    render(<Pagination offset={0} rowCount={10} limit={10} onPrevious={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('enables Previous past the first page', () => {
    render(<Pagination offset={10} rowCount={10} limit={10} onPrevious={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled()
  })

  it('disables Next when the page is not full', () => {
    render(<Pagination offset={0} rowCount={4} limit={10} onPrevious={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('enables Next when the page is exactly full', () => {
    render(<Pagination offset={0} rowCount={10} limit={10} onPrevious={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
  })

  it('calls onNext and onPrevious when clicked', () => {
    const onNext = vi.fn()
    const onPrevious = vi.fn()
    render(<Pagination offset={10} rowCount={10} limit={10} onPrevious={onPrevious} onNext={onNext} />)
    screen.getByRole('button', { name: /next/i }).click()
    screen.getByRole('button', { name: /previous/i }).click()
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrevious).toHaveBeenCalledTimes(1)
  })
})
