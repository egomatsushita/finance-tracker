import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './Toast'

function Probe() {
  const { showToast } = useToast()
  return (
    <div>
      <button onClick={() => showToast('Profile updated')}>show success</button>
      <button onClick={() => showToast('Something went wrong', 'error')}>show error</button>
    </div>
  )
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing before a toast is shown', () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    )
    expect(screen.queryByText('Profile updated')).not.toBeInTheDocument()
  })

  it('shows a message when showToast is called', async () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('show success'))
    expect(screen.getByText('Profile updated')).toBeInTheDocument()
  })

  it('dismisses the toast when the close button is clicked', async () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('show success'))
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(screen.queryByText('Profile updated')).not.toBeInTheDocument()
  })

  it('auto-dismisses after the timeout', async () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('show success'))
    expect(screen.getByText('Profile updated')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4001)
    })

    expect(screen.queryByText('Profile updated')).not.toBeInTheDocument()
  })
})
