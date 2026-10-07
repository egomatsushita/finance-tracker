import type { ApiErrorBody, LoginResponse } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const TOKEN_KEY = 'ft_token'

export class ApiError extends Error {
  status: number
  body: ApiErrorBody

  constructor(status: number, body: ApiErrorBody) {
    super(typeof body.detail === 'string' ? body.detail : 'Request failed')
    this.status = status
    this.body = body
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
}

// Module-level dedup guard: several in-flight requests can all receive a 401
// around the same moment (e.g. token expiry), but the clear+redirect should
// only happen once. Reset after a fresh login starts a new session.
let unauthorizedHandled = false

function handleUnauthorized(): void {
  if (unauthorizedHandled) return
  unauthorizedHandled = true
  clearToken()
  if (typeof window !== 'undefined') {
    // Plain module, no router available here; a hard navigation is also
    // what we want — it fully resets client state after session invalidation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login')
  }
}

export function resetUnauthorizedGuard(): void {
  unauthorizedHandled = false
}

async function parseErrorBody(res: Response): Promise<ApiErrorBody> {
  try {
    return (await res.json()) as ApiErrorBody
  } catch {
    return { detail: res.statusText || 'Request failed' }
  }
}

async function request<T>(path: string, init: RequestInit = {}, skipAuthRedirect = false): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })

  if (res.status === 401) {
    const body = await parseErrorBody(res)
    if (!skipAuthRedirect) handleUnauthorized()
    throw new ApiError(401, body)
  }

  if (!res.ok) {
    const body = await parseErrorBody(res)
    throw new ApiError(res.status, body)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// Used by AuthProvider's mount-time hydration: a stale/garbage token should
// settle quietly to logged-out, not trigger a redirect (there's nothing to
// redirect away from yet).
export function getWithAuthHandling<T>(path: string, skipAuthRedirect: boolean): Promise<T> {
  return request<T>(path, { method: 'GET' }, skipAuthRedirect)
}

// Login is form-encoded and a 401 here means bad credentials, not session
// expiry, so it must never go through handleUnauthorized()/redirect.
export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  const body = new URLSearchParams({ username, password })
  const res = await fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const errBody = await parseErrorBody(res)
    throw new ApiError(res.status, errBody)
  }

  return res.json()
}
