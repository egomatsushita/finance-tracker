'use client'

import { LogoutButton } from './LogoutButton'
import { NavLinks } from './NavLinks'

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="hidden w-64 flex-col justify-between border-r border-muted-border bg-surface p-4 md:flex">
      <div className="flex flex-col gap-6">
        <span className="px-2 text-lg font-semibold tracking-tight text-ink">
          Finance <span className="text-highlight">Tracker</span>
        </span>
        <NavLinks />
      </div>
      <LogoutButton onLogout={onLogout} />
    </div>
  )
}
