'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { AppShell } from '@/components/nav/AppShell'
import { AppShellSkeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/lib/auth'

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user === null) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading || user === null) {
    return <AppShellSkeleton />
  }

  return <AppShell>{children}</AppShell>
}
