# CLAUDE.md — Frontend (`web/`)

Next.js 16 (App Router) + React 19, Tailwind v4. Tests: Vitest + RTL (`npm test`). Frontend work is TDD, same as the backend.

## Conventions

**`cacheComponents` is enabled — client-auth-gated pages need `instant = false`.**
`next.config.ts` sets `cacheComponents: true`, so Next validates instant navigation. Any page whose rendering is gated by a **client** auth guard (the `(auth)` guest guard, the `(app)` auth layout) is dropped from the server prerender and trips the dev-only "instant-unrendered-segment" insight. For such a page, do **not** put the logic in a `'use client'` `page.tsx`. Instead make `page.tsx` a thin Server Component that exports `instant = false` and renders a client component holding the body:

```tsx
// app/(auth)/signup/page.tsx
import { SignupForm } from './SignupForm'
export const instant = false
export default function SignupPage() {
  return <SignupForm />
}
```

`export const instant = false` is illegal in a `'use client'` module, and setting it on the guard *layout* does not cover child pages — it must be on the page. Reference: `app/(auth)/signup/{page.tsx,SignupForm.tsx}`.
