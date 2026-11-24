'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type ToastVariant = 'success' | 'error'

type Toast = { id: number; message: string; variant: ToastVariant }

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const TOAST_DURATION_MS = 4000

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-income text-income',
  error: 'border-expense text-expense',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const nextId = useRef(0)

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    setToast({ id: nextId.current++, message, variant })
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = toast.id
    const timeoutId = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
    }, TOAST_DURATION_MS)
    return () => clearTimeout(timeoutId)
  }, [toast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50" role="status" aria-live="polite">
        {toast && (
          <div
            className={`flex items-center gap-3 rounded-lg border bg-surface px-4 py-3 text-sm font-medium shadow-md ${variantClasses[toast.variant]}`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss"
              className="cursor-pointer text-muted-text"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
