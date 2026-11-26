# CLAUDE.md — Frontend (`web/`)

Next.js 16 (App Router) + React 19, Tailwind v4. Tests: Vitest + RTL (`npm test`). Frontend work is TDD, same as the backend.

## Conventions

**Pages are Server wrappers over a client body.** Every `page.tsx` under `(app)`/`(auth)` is a Server Component rendering a client `*Client`/`*Form` child; gated pages also `export const instant = false` (keeps `cacheComponents` instant-navigation validation from dropping them). An ESLint rule bans `'use client'` in those page files. Example: `app/(auth)/signup/{page.tsx,SignupForm.tsx}`.
