import { ProfileClient } from './ProfileClient'

// (app)/layout.tsx gates rendering on client-side auth state, and this
// page's content depends on client-side auth data (ProfileClient),
// so it can never produce a statically-verifiable instant shell.
export const instant = false

export default function ProfilePage() {
  return <ProfileClient />
}
