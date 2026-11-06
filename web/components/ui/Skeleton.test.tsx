import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppShellSkeleton, Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders a pulsing block', () => {
    render(<Skeleton className="h-4 w-4" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('AppShellSkeleton', () => {
  it('renders a status role for the overall shell skeleton', () => {
    render(<AppShellSkeleton />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
