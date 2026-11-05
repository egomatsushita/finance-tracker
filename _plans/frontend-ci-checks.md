# Plan: FT-44 — Frontend CI Checks

## Context
`.github/workflows/ci.yml` only runs backend checks (`ruff`, `pytest`, a Docker build). Since FT-34, `web/` has had its own `lint`/`test`(Vitest)/`build` scripts, but three frontend PRs (FT-34, FT-35/43, FT-36) have merged with nothing in CI running them — a lint error, failing test, or broken build would go uncaught. This ticket adds a `frontend` job to the existing workflow so frontend regressions get the same automated gate backend code already has. Spec: `_specs/frontend-ci-checks.md`.

Verified facts: no root `package.json` (Next.js app lives entirely under `web/`); no `engines`/`.nvmrc` anywhere (Node version isn't pinned yet, local dev uses v24.13.0); `web/package-lock.json` is committed; `web/lib/api.ts:3`'s module-scope `process.env.NEXT_PUBLIC_API_URL` read does **not** fail `next build` when unset (Next.js just inlines `undefined`, no build-time validation) — so no secrets/env vars are needed for this job.

## Approach

### 1. Add a `frontend` job to `.github/workflows/ci.yml`
Insert **after `test`, before `docker-build`** — groups "code correctness" checks (backend + frontend lint/test) together before the slower build-artifact job, which stays last and untouched.

```yaml
  frontend:
    name: Frontend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

Notes:
- Job-level `defaults.run.working-directory: web` (not per-step) — one place to get right, every step in this job touches `web/`.
- `cache-dependency-path` is repo-root-relative (`web/package-lock.json`), unaffected by the job's working-directory default — it's an input to `actions/setup-node@v4`, not a `run:` step.
- `node-version: '24'` (quoted major only, not an exact patch) — matches local dev's major version without needing a bump on every patch release; no `.nvmrc`/`engines` constraint elsewhere to stay in sync with anyway.
- `npm ci`, not `npm install` — reproducible, lockfile-strict (and will correctly fail CI if `package.json`/`package-lock.json` ever drift).
- Order (lint → test → build) is fail-fast: cheapest check first.
- No changes to `docker-build` — a `web` Docker image is explicitly out of scope per `_plans/dashboard.md`.

## Verification
1. **Local baseline first** (must be green before touching the YAML): `cd web && npm run lint && npm run test && npm run build`.
2. **Negative check** (per spec's Testing Guidelines): introduce a trivial lint violation locally, confirm `npm run lint` fails, then revert before committing — proves the job's fail path works without leaving breakage in the diff.
3. **YAML sanity**: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`.
4. **Live verification** (spec explicitly wants this, not just local success): push the branch, open a PR to `main`, confirm a new "Frontend" check appears alongside "Lint"/"Test"/"Docker build" and runs green; confirm the three existing backend jobs are unaffected. Optionally push a throwaway breaking commit to confirm the check goes red and blocks, then a follow-up fixing it to confirm green again.

## Commit
Single commit: `[FT-44] feat: add frontend CI job for lint, test, and build checks`.

## Critical files
- `.github/workflows/ci.yml` (edit — the only file changed)
