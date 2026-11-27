# Spec for Frontend CI Checks

branch: FT-44_frontend-ci-checks

## Summary
`.github/workflows/ci.yml` only runs backend checks (`ruff check`, `pytest`, a Docker build). Since FT-34, `web/` has had its own `lint`, `test` (Vitest), and `build` (`next build`) scripts, but nothing in CI runs them — three frontend PRs (FT-34, FT-35/43, FT-36) have merged without any automated check catching a lint error, a failing test, or a broken build. This ticket adds a `web` job to the existing workflow so frontend regressions are caught the same way backend ones already are.

## Functional Requirements
- Add a new job (e.g. `frontend`) to `.github/workflows/ci.yml`, parallel to the existing `lint`/`test`/`docker-build` jobs (matches this repo's existing parallel-jobs convention, confirmed via `_specs/github-actions-ci.md`'s resolved Open Question).
- Steps: checkout, set up Node (pin a version — no `.nvmrc`/`engines` field exists in `web/package.json` today, so pin explicitly in the workflow, e.g. via `actions/setup-node@v4` with `node-version: 24` to match local dev), install deps via `npm ci` (not `npm install`, for reproducible CI installs from `web/package-lock.json`) with `working-directory: web`, then run `npm run lint`, `npm run test`, and `npm run build` in that order (fail fast on the cheapest check first).
- Use `actions/setup-node@v4`'s built-in `cache: npm` + `cache-dependency-path: web/package-lock.json` for npm cache, mirroring how the backend job benefits from `uv`'s fast dependency resolution — keeps CI runs quick without hand-rolling a cache step.
- No new secrets or environment variables needed — `npm run build` doesn't require a live backend or a real `NEXT_PUBLIC_API_URL` (Next.js build doesn't make network calls at build time for this app; confirm during implementation that build doesn't fail without `.env.local` present, since CI won't have one).
- Workflow and job naming stays human-readable and consistent with existing jobs (e.g. job name "Frontend").

## Possible Edge Cases
- `web/package-lock.json` must stay in sync with `web/package.json`, or `npm ci` fails outright (this is actually a feature — `npm ci` is intentionally stricter than `npm install` and will correctly fail CI if someone edits `package.json` without regenerating the lockfile).
- `npm run build` writes to `web/.next/` — no caching of build output is needed or wanted; a cold build each run keeps CI deterministic and catches issues a stale cache could mask.
- `npm run test` (Vitest) runs via `jsdom`; confirm no step needs a browser binary (it doesn't — this is unit/component testing, not e2e, consistent with `_plans/dashboard.md`'s explicit "no e2e test harness" scope decision).
- If `NEXT_PUBLIC_API_URL` is unset in CI (no `.env.local` there), confirm `next build` still succeeds — the env var is only read at request-time by `web/lib/api.ts`, not at build time, so this should be a non-issue, but worth confirming empirically rather than assuming.
- Monorepo path scoping: the new job's steps need `working-directory: web` (or equivalent `cd web &&` prefixes) since `package.json` lives in `web/`, not the repo root — easy to get wrong and have the job silently run against the wrong directory.

## Acceptance Criteria
- A PR targeting `main` triggers the new frontend job automatically, running alongside the existing backend jobs.
- A Vitest test failure, an ESLint failure, or a `next build` failure on a branch causes the frontend job (and therefore the PR's overall check) to fail.
- The frontend job passes on `main`'s current state (i.e. this ticket doesn't surface a pre-existing frontend issue that would need separate fixing — if it does, that's a finding to report, not silently work around).
- The frontend job completes without requiring any secrets or a running backend instance.
- Existing backend jobs (`lint`, `test`, `docker-build`) are unaffected — this change is purely additive.

## Open Questions
- Should the frontend job block merge the same as backend jobs, or start as non-blocking (e.g. `continue-on-error: true`) for an initial trial period? Recommend blocking from the start — the backend CI ticket (FT-27) made jobs blocking immediately, and letting frontend regressions through during a "trial" period defeats the purpose of adding this now. (Follow the recommendation.)
- Should `docker-build` be extended to also build a `web` image/stage, or is that explicitly out of scope? Recommend out of scope — `_plans/dashboard.md`'s "Out of scope" list already defers "dockerizing the web service" to a future ticket; this ticket is CI checks only, not deployment packaging. (Follow the recommendation.)

## Testing Guidelines
This is infrastructure-only (a YAML workflow edit) — no application code to unit-test. Verification:
- Confirm `.github/workflows/ci.yml` is valid YAML.
- Locally, run `npm run lint`, `npm run test`, and `npm run build` inside `web/` and confirm all three pass (establishing the baseline the new CI job should also pass).
- Push this branch and open a PR to confirm the new "Frontend" job actually runs and passes in GitHub Actions.
- Intentionally break one check locally first (e.g. a temporary lint violation) to confirm — before removing it — that the job would correctly fail; don't leave this breakage in the final commit.
