'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { MobileDrawer } from './MobileDrawer'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch {
      // Whatever the cause, still send the user to /login rather than
      // leaving them stuck on a broken authed page.
    }
    // Hard navigation, not router.replace(): the login page is otherwise
    // reused from the Next.js router cache (same component instance, not
    // remounted), so react-hook-form's inputs keep whatever was last typed
    // in them. A full reload guarantees a clean login form, same as the
    // session-expiry redirect in lib/api.ts's handleUnauthorized().
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login')
  }, [logout])

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setDrawerOpen(false)
    }
    onChange(mql)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="flex min-h-screen bg-ground">
      <Sidebar onLogout={handleLogout} />
      <div className="flex flex-1 flex-col">
        <TopBar isOpen={drawerOpen} onToggle={() => setDrawerOpen((open) => !open)} />
        <main className="flex-1">{children}</main>
      </div>
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={handleLogout} />
    </div>
  )
}
