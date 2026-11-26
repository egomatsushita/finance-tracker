# CLAUDE.md — Frontend (`web/`)

Next.js 16 (App Router) + React 19, Tailwind v4. Tests: Vitest + RTL (`npm test`). Frontend work is TDD, same as the backend.

## Conventions

**Client-auth-gated pages must export `instant = false`.** `cacheComponents` is on, so a page gated by a client auth guard (the `(auth)` or `(app)` layout) trips the dev-only instant-navigation insight. Make `page.tsx` a Server Component exporting `instant = false` that renders a `'use client'` body component:

```tsx
// app/(auth)/signup/page.tsx
import { SignupForm } from './SignupForm'
export const instant = false
export default function SignupPage() {
  return <SignupForm />
}
```

`instant` can't be exported from a `'use client'` module, and on the guard *layout* it doesn't cover child pages — it must be on the page.
