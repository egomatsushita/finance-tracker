import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('api.ts cookie/CSRF behavior', () => {
  beforeEach(() => {
    vi.resetModules()
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(body: unknown = {}, status = 200) {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('attaches X-CSRF-Token on mutating requests when the cookie is set', async () => {
    document.cookie = 'csrf_token=abc123'
    const fetchMock = stubFetch({ ok: true })
    const { api } = await import('./api')

    await api.post('/transactions/', { amount: '1.00' })

    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('X-CSRF-Token')).toBe('abc123')
  })

  it('does not attach X-CSRF-Token on GET requests', async () => {
    document.cookie = 'csrf_token=abc123'
    const fetchMock = stubFetch({ ok: true })
    const { api } = await import('./api')

    await api.get('/transactions/')

    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('X-CSRF-Token')).toBeNull()
  })

  it('always sends credentials: include', async () => {
    const fetchMock = stubFetch({ ok: true })
    const { api } = await import('./api')

    await api.get('/users/me')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.credentials).toBe('include')
  })

  it('never sets an Authorization header', async () => {
    document.cookie = 'csrf_token=abc123'
    const fetchMock = stubFetch({ ok: true })
    const { api } = await import('./api')

    await api.post('/transactions/', { amount: '1.00' })

    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBeNull()
  })

  it('loginRequest includes credentials and returns the parsed body', async () => {
    const fetchMock = stubFetch({ detail: 'ok' })
    const { loginRequest } = await import('./api')

    const result = await loginRequest('member', 'member')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.credentials).toBe('include')
    expect(result).toEqual({ detail: 'ok' })
  })

  it('signupRequest posts to /auth/signup with credentials and the parsed body', async () => {
    const fetchMock = stubFetch({ detail: 'ok' })
    const { signupRequest } = await import('./api')

    const result = await signupRequest('newbie', 'newbie@example.com', 'password')

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/auth/signup')
    expect(init.credentials).toBe('include')
    expect(JSON.parse(init.body)).toEqual({
      username: 'newbie',
      email: 'newbie@example.com',
      password: 'password',
    })
    expect(result).toEqual({ detail: 'ok' })
  })

  it('logoutRequest posts to /auth/logout with credentials and CSRF header', async () => {
    document.cookie = 'csrf_token=abc123'
    const fetchMock = stubFetch({ detail: 'ok' })
    const { logoutRequest } = await import('./api')

    await logoutRequest()

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/auth/logout')
    expect(init.credentials).toBe('include')
    const headers = new Headers(init.headers)
    expect(headers.get('X-CSRF-Token')).toBe('abc123')
  })
})
