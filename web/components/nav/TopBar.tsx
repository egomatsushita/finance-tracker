'use client'

import { Menu } from 'lucide-react'

export function TopBar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-muted-border bg-surface px-4 md:hidden">
      <span className="text-base font-semibold tracking-tight text-ink">
        Finance <span className="text-highlight">Tracker</span>
      </span>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
        className="rounded-lg p-2 text-muted-text transition-colors hover:bg-ground hover:text-ink"
      >
        <Menu aria-hidden="true" className="h-6 w-6" />
      </button>
    </div>
  )
}
