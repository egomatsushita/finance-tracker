'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user !== null) {
      router.replace('/')
    }
  }, [loading, user, router])

  if (loading || user !== null) {
    return null
  }

  return <>{children}</>
}
