'use client'

import { LogOut } from 'lucide-react'

export function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <button
      type="button"
      onClick={onLogout}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-text transition-colors hover:bg-ground hover:text-ink"
    >
      <LogOut aria-hidden="true" className="h-5 w-5" />
      Log out
    </button>
  )
}
