# Spec for GitHub Actions CI

branch: FT-27_github-actions-ci

## Summary

Add a GitHub Actions workflow that runs `pytest` and `ruff` on every pull request targeting the `main` branch. The workflow must pass before a PR can be merged, providing automated quality gates for linting and test coverage.

## Functional Requirements

- A workflow file is added at `.github/workflows/ci.yml`.
- The workflow triggers on `pull_request` events targeting `main`.
- The workflow runs on `ubuntu-latest`.
- The workflow installs dependencies using `uv sync`.
- The workflow runs `uv run ruff check .` to lint the codebase.
- The workflow runs `uv run pytest` to execute the test suite.
- Both steps run against the feature branch HEAD.
- The workflow name and job names are human-readable (e.g. "CI", "lint", "test").

## Possible Edge Cases

- `uv` may not be available by default on the GitHub Actions runner — needs explicit installation (e.g. via `astral-sh/setup-uv`).
- Python version must match the project's requirement — should be pinned or read from `.python-version` if present.
- Tests rely on an in-memory SQLite database, so no external service setup is needed.
- Ruff configuration lives in `pyproject.toml`; the workflow should not pass extra flags that override it.

## Acceptance Criteria

- A PR to `main` triggers the workflow automatically.
- A ruff lint failure causes the workflow to fail.
- A pytest failure causes the workflow to fail.
- Both checks must pass for the PR to be considered green.
- The workflow completes without requiring secrets or external services.

## Open Questions

- Should lint and test run as separate jobs (parallel) or sequential steps in one job? parallel
- Should the Python version be pinned explicitly in the workflow or derived from `.python-version`? derived from `.python-version`
- Should branch protection rules be configured separately (outside this ticket)? I'll configure it later.

## Testing Guidelines

This feature is infrastructure-only (a YAML workflow file) and has no application code to unit-test. Verification is done by:

- Confirming the workflow file is valid YAML and passes `actionlint` or similar linting if available.
- Opening a draft PR to `main` and observing the workflow is triggered and passes.
- Intentionally introducing a ruff violation or a failing test on a branch to confirm the workflow correctly fails and blocks the PR.
