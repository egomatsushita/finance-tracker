import { OverviewClient } from './OverviewClient'

// (app)/layout.tsx gates rendering on client-side auth state, and this
// page's content depends on client-side data fetching (OverviewClient),
// so it can never produce a statically-verifiable instant shell.
export const instant = false

export default function Home() {
  return <OverviewClient />
}
