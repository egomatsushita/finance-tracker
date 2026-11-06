'use client'

import { useEffect } from 'react'
import { LogoutButton } from './LogoutButton'
import { NavLinks } from './NavLinks'

export function MobileDrawer({
  isOpen,
  onClose,
  onLogout,
}: {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div data-testid="mobile-drawer-backdrop" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="relative flex h-full w-64 flex-col justify-between bg-surface p-4 shadow-lg">
        <NavLinks onLinkClick={onClose} />
        <LogoutButton onLogout={onLogout} />
      </div>
    </div>
  )
}
