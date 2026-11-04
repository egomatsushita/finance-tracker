# Plan: FT-36 — Login Page

## Context
FT-35 built the API client/auth foundation (cookie-based, per FT-43's later migration); FT-36 is the first real page and the first `ui/` primitives. It also fixes a real bug surfaced while reviewing the spec: `useAuth().login()` currently resolves successfully even when post-login hydration (`GET /users/me`) fails, silently leaving `user: null` with no error — the login page needs this fixed so its error branch can catch it. Spec: `_specs/login-page.md` (already finalized — implement against it, don't re-litigate its resolved Open Questions).

**Infra gap found during planning (not in the spec, must fix first):** `web/vitest.config.ts` has no path-alias resolution at all. The login page and its primitives will use `@/lib/auth`, `@/lib/api`, `@/components/ui/*` imports (matching the existing convention in `app/providers.tsx`), but Vitest/Vite doesn't respect `tsconfig.json`'s `paths` automatically — there's no `vite-tsconfig-paths` plugin or `resolve.alias`. Existing tests (`lib/auth.test.tsx`, `lib/api.test.ts`) never hit this because they only use relative imports. The moment a test imports `app/login/page.tsx`, which transitively imports `@/lib/auth` etc., resolution will fail. Fix: add `resolve.alias` to `vitest.config.ts` pointing `@` at the project root (no new dependency needed — `tsconfig.json`'s alias is already `"@/*": ["./*"]`).

## Approach

### 0. Fix Vitest alias resolution (prerequisite)
`web/vitest.config.ts`:
```ts
import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

### 1. Dependencies
`npm install react-hook-form zod @hookform/resolvers` (production deps). Test harness deps already present from FT-43.

### 2. `web/components/ui/` primitives
New directory. Each gets a Vitest test written first (TDD).

- **`Button.tsx`** — `forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'; isLoading?: boolean }>`. `variant` maps to `bg-brand text-ink` (primary) / `border border-muted-border bg-surface text-ink` (secondary). `disabled={disabled || isLoading}`; swap label to a loading indicator when `isLoading` (no toast system, simplest signal). Sentence-case labels, no `→` glyphs, per design system.
- **`Input.tsx`** — `forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }>`. Renders `<label htmlFor>` + `<input id>` (falls back to `name` if no `id` passed) + optional `<p className="text-expense">{error}</p>` beneath. `forwardRef` is required — `react-hook-form`'s `register()` spread needs the ref. `type` flows through via `InputHTMLAttributes` (resolves the spec's Open Question: yes, generic `type` now).
- **`Card.tsx`** — simple surface wrapper, lifts the exact pattern already used in `app/design/page.tsx`: `rounded-lg border border-muted-border bg-surface p-6 shadow-sm`.

### 3. Fix `web/lib/auth.tsx`
Change only `login`'s body:
```tsx
const login = useCallback(async (username: string, password: string) => {
  await loginRequest(username, password)
  resetUnauthorizedGuard()
  const hydratedUser = await hydrate()
  if (hydratedUser === null) {
    throw new Error('Login succeeded but failed to load user profile')
  }
  setUser(hydratedUser)
}, [])
```
`setUser` only runs on the success path now, so a failed post-login hydration rejects instead of silently resolving with `user` left `null`. The thrown plain `Error` (not `ApiError`) correctly routes to the login page's generic "Something went wrong" branch.

Add a test case to the existing `describe('AuthProvider', ...)` in `lib/auth.test.tsx`: extend the test file's `Probe` component to catch `login()`'s rejection into local state (`data-testid="login-error"`), mock `loginRequest` to resolve and `getWithAuthHandling` to resolve `null` on the post-login hydration call, click login, assert the error surfaces and `user` stays `'none'`.

### 4. `web/app/login/page.tsx`
`'use client'`. zod schema (`username`/`password`, both `min(1)`), `useForm` + `zodResolver`, submit handler calls `useAuth().login(...)`; on success `router.push('/')` (unconditional, per spec); on failure, `err instanceof ApiError && err.status === 401` → "Incorrect username or password", else → "Something went wrong" (covers the new auth.tsx throw path too, since it's a plain `Error`). `formState.isSubmitting` drives `Button`'s `isLoading` — RHF already ignores a second `handleSubmit` while one is pending, so this alone satisfies the double-submit edge case, no extra state needed. Product mark ("Finance Tracker", with "Tracker" in `text-highlight`) is the page's one bold element; everything else uses `text-ink`/`bg-surface`/`bg-ground`. `noValidate` on `<form>` to avoid native validation racing zod's.

### 5. Tests (written before each implementation, per spec's TDD requirement)
All new test files use **relative imports** (confirmed: no alias plugin existed before step 0, and even after fixing it, matching the existing `lib/*.test.*` convention avoids inconsistency). `vi.mock`'s target string must match whatever specifier the *source* file under test uses (e.g. mock `'@/lib/auth'` to intercept `page.tsx`'s own `@/lib/auth` import, even though the test file imports the page itself relatively).

- **`Button.test.tsx`**: renders children; click calls `onClick` once; `isLoading` → disabled + click doesn't fire; `disabled` → click doesn't fire.
- **`Input.test.tsx`**: `getByLabelText` resolves to the input (validates `htmlFor`/`id`); `error` prop renders its text; ref forwarding works (`createRef`, assert `instanceof HTMLInputElement`) and `fireEvent.change` updates value.
- **`Card.test.tsx`**: renders children (minimal composition check).
- **`login/page.test.tsx`**: `vi.hoisted` + `vi.mock('@/lib/auth', ...)` (mock `login`) and `vi.mock('next/navigation', ...)` (mock `useRouter().push`). Cases: renders fields + "Sign in" button; empty submit shows zod errors, `login` not called; valid submit calls `login('member','member')` then `push('/')`; `login` rejecting with `ApiError(401, ...)` (import real `ApiError` from `@/lib/api`) shows the 401 message, no navigation; `login` rejecting with a plain `Error` shows "Something went wrong"; double-submit — pending `login` promise keeps submit disabled, second click doesn't call `login` again, then resolves and navigates.

### 6. Commit breakdown
One concern per commit, matching this repo's established granularity (FT-34/35/43):
1. `[FT-36] fix: configure @/ alias resolution for Vitest`
2. `[FT-36] chore: add react-hook-form, zod, and @hookform/resolvers dependencies`
3. `[FT-36] feat: add Button UI primitive` (component + test together — TDD unit)
4. `[FT-36] feat: add Input UI primitive` (component + test together)
5. `[FT-36] feat: add Card UI primitive` (component + test together)
6. `[FT-36] fix: throw from login() when post-login hydration returns null` (auth.tsx + auth.test.tsx addition)
7. `[FT-36] feat: add login page` (page.tsx + page.test.tsx)

## Verification
- `npm run lint`, `npm run build`, `npm run test` all clean.
- Manual, backend (`uv run app/main.py`) + frontend (`npm run dev`) running concurrently, visit `/login`:
  - `member`/`member` → redirects to `/`, no console errors.
  - Wrong password → inline "Incorrect username or password", stays on `/login`.
  - Empty submit → zod messages, no `/auth/token` request fired (check Network tab).
  - Tab order username → password → submit, visible focus ring throughout.

## Critical files
- `web/vitest.config.ts` (edit — alias fix)
- `web/lib/auth.tsx` (edit — login() fix)
- `web/components/ui/Button.tsx`, `Input.tsx`, `Card.tsx` (new)
- `web/app/login/page.tsx` (new)
- Corresponding `*.test.tsx` for each (new)
