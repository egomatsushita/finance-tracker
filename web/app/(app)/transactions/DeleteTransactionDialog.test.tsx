import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DeleteTransactionDialog } from './DeleteTransactionDialog'

describe('DeleteTransactionDialog', () => {
  it('renders nothing when closed', () => {
    render(<DeleteTransactionDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not call onConfirm until the Delete button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<DeleteTransactionDialog isOpen onClose={vi.fn()} onConfirm={onConfirm} />)

    expect(onConfirm).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  })

  it('closes without confirming when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    render(<DeleteTransactionDialog isOpen onClose={onClose} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
