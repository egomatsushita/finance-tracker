import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('associates the label with the input', () => {
    render(<Input label="Username" />)
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
  })

  it('renders an error message when passed one', () => {
    render(<Input label="Username" error="Username is required" />)
    expect(screen.getByText('Username is required')).toBeInTheDocument()
  })

  it('forwards a ref and accepts typed input', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input label="Username" ref={ref} name="username" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'member' } })
    expect(ref.current?.value).toBe('member')
  })
})
