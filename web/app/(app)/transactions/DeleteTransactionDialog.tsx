'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

type DeleteTransactionDialogProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteTransactionDialog({ isOpen, onClose, onConfirm }: DeleteTransactionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setIsDeleting(true)
    setError(null)
    try {
      await onConfirm()
    } catch {
      setError('Failed to delete this transaction. It may have already been deleted.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete transaction">
      <p className="text-sm text-muted-text">
        Are you sure you want to delete this transaction? This cannot be undone.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-expense">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleConfirm} isLoading={isDeleting}>
          Delete
        </Button>
      </div>
    </Modal>
  )
}
