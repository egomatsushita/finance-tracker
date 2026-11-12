import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  elevated = true,
}: {
  children: ReactNode
  className?: string
  elevated?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-muted-border bg-surface p-6 ${elevated ? 'shadow-md' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
