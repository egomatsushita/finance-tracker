'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getWithAuthHandling, loginRequest, logoutRequest, resetUnauthorizedGuard } from './api'
import type { User } from './types'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function hydrate(): Promise<User | null> {
  try {
    return await getWithAuthHandling<User>('/users/me', true)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    hydrate().then((hydratedUser) => {
      if (active) {
        setUser(hydratedUser)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    await loginRequest(username, password)
    resetUnauthorizedGuard()
    const hydratedUser = await hydrate()
    setUser(hydratedUser)
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
