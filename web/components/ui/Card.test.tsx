import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('renders its children', () => {
    render(
      <Card>
        <p>Sign in to continue</p>
      </Card>,
    )
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument()
  })
})
