# Plan: GitHub Actions CI (FT-27)

## Context

The project has no CI pipeline. This adds a GitHub Actions workflow that runs `ruff` and `pytest` on every PR targeting `main`, providing automated quality gates before merge. The spec (open questions resolved) calls for parallel jobs and Python version derived from `.python-version`.

## What exists

- `.python-version` → `3.12`
- `pyproject.toml` → `requires-python = ">=3.12"`, `tool.uv.default-groups = ["dev", "test"]` (ruff and pytest included by default in `uv sync`)
- Ruff config: `line-length = 88`, `target-version = "py312"`, `exclude = ["app/docs"]`
- Pytest config: `asyncio_mode = "auto"`, `testpaths = ["tests"]`, `pythonpath = ["app"]`
- No `.github/` directory exists yet

## Files to create

- `.github/workflows/ci.yml` — the only file needed

## Implementation

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches:
      - main

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
        with:
          python-version-file: .python-version
      - run: uv sync
      - run: uv run ruff check .

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
        with:
          python-version-file: .python-version
      - run: uv sync
      - run: uv run pytest
```

Key decisions:
- `astral-sh/setup-uv@v5` installs both uv and Python, reading the version from `.python-version` via `python-version-file`
- `uv sync` installs all default groups (dev + test), so ruff and pytest are available with no extra flags
- Two independent parallel jobs — a lint failure doesn't block the test job from running
- No caching config needed; `setup-uv` enables uv's built-in caching by default

## Verification

1. Push the branch and open a PR to `main` — confirm the workflow appears under "Checks"
2. Confirm both `Lint` and `Test` jobs pass on a clean branch
3. Introduce a ruff violation (e.g. unused import) — confirm `Lint` fails
4. Introduce a failing test — confirm `Test` fails
