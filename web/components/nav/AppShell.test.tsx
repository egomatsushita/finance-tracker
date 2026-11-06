import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { useAuthMock, usePathnameMock, replace } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  usePathnameMock: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: usePathnameMock,
}))

import { AppShell } from './AppShell'

type MediaQueryListener = (event: { matches: boolean }) => void

function stubMatchMedia(initialMatches: boolean) {
  let listener: MediaQueryListener | null = null
  const mql = {
    matches: initialMatches,
    addEventListener: (_: string, cb: MediaQueryListener) => {
      listener = cb
    },
    removeEventListener: () => {
      listener = null
    },
  }
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql))
  return {
    fireChange: (matches: boolean) => {
      mql.matches = matches
      listener?.({ matches })
    },
  }
}

describe('AppShell', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/')
    useAuthMock.mockReturnValue({ logout: vi.fn().mockResolvedValue(undefined) })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens the mobile drawer when the hamburger is clicked', async () => {
    stubMatchMedia(false)
    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    )

    expect(screen.queryAllByRole('link', { name: 'Overview' })).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: /navigation/i }))
    expect(screen.queryAllByRole('link', { name: 'Overview' })).toHaveLength(2)
  })

  it('closes the drawer when a nav link inside it is clicked', async () => {
    stubMatchMedia(false)
    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    )

    await userEvent.click(screen.getByRole('button', { name: /navigation/i }))
    expect(screen.queryAllByRole('link', { name: 'Overview' })).toHaveLength(2)

    const drawerLinks = screen.getAllByRole('link', { name: 'Overview' })
    await userEvent.click(drawerLinks[1])
    expect(screen.queryAllByRole('link', { name: 'Overview' })).toHaveLength(1)
  })

  it('closes the drawer when the viewport crosses into desktop width', async () => {
    const media = stubMatchMedia(false)
    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    )

    await userEvent.click(screen.getByRole('button', { name: /navigation/i }))
    expect(screen.queryAllByRole('link', { name: 'Overview' })).toHaveLength(2)

    act(() => {
      media.fireChange(true)
    })
    expect(screen.queryAllByRole('link', { name: 'Overview' })).toHaveLength(1)
  })

  it('logs out and redirects to /login when logout is clicked', async () => {
    stubMatchMedia(false)
    const logout = vi.fn().mockResolvedValue(undefined)
    useAuthMock.mockReturnValue({ logout })
    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    )

    await userEvent.click(screen.getAllByRole('button', { name: 'Log out' })[0])
    expect(logout).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('renders children inside the main content area', () => {
    stubMatchMedia(false)
    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
