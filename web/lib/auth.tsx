'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { ApiError, clearToken, getToken, getWithAuthHandling, loginRequest, resetUnauthorizedGuard, setToken } from './api'
import type { User } from './types'

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function hydrate(): Promise<User | null> {
  const token = getToken()
  if (!token) return null
  try {
    return await getWithAuthHandling<User>('/users/me', true)
  } catch (err) {
    // Only a confirmed 401 means the token is actually invalid. A transient
    // network/server failure must not wipe a token that's still good —
    // otherwise a blip during hydration forces a real re-login.
    if (err instanceof ApiError && err.status === 401) {
      clearToken()
    }
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
    const { access_token } = await loginRequest(username, password)
    setToken(access_token)
    resetUnauthorizedGuard()
    const hydratedUser = await hydrate()
    setUser(hydratedUser)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
