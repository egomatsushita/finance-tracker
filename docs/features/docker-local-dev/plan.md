# Plan: Docker Local Dev (FT-28)

## Context

The app has no containerization. This adds a `Dockerfile` and `docker-compose.yml` for local development — allowing the API to be started with `docker compose up`, with hot-reload and settings sourced from the existing `.env` file. No production hardening.

## Key findings

- `app/main.py` starts uvicorn via `uv run app/main.py`, with `reload=True` already set
- `uvicorn_host` defaults to `127.0.0.1` — **must be overridden to `0.0.0.0`** in compose or the API won't be reachable from the host
- `secret_key` is the only required setting with no default; it's already in `.env`
- `.env` and `.env.example` both exist; compose will load `.env` via `env_file`
- Best base image: `ghcr.io/astral-sh/uv:python3.12-bookworm-slim` — ships both uv and Python 3.12, no extra install step

## Files to create

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

## Implementation

### `Dockerfile`

- Base image: `ghcr.io/astral-sh/uv:python3.12-bookworm-slim`
- `WORKDIR /app`
- Copy `pyproject.toml` and `uv.lock` first, run `uv sync --frozen` to install deps into the image layer cache
- Copy the rest of the project
- No `CMD` — the command is defined in compose

### `docker-compose.yml`

- Single `app` service
- `build: .`
- `ports: "8000:8000"`
- `volumes: .:/app` (bind mount — enables hot-reload without rebuilding)
- `env_file: .env` — loads `SECRET_KEY` and other settings
- `environment: UVICORN_HOST=0.0.0.0` — overrides the `127.0.0.1` default so the API is reachable from the host
- `command: uv run app/main.py`

### `.dockerignore`

Exclude: `.venv/`, `.git/`, `__pycache__/`, `*.pyc`, `*.db`, `.env`, `.pytest_cache/`, `.ruff_cache/`

## Verification

1. `docker compose build` — image builds cleanly from a clean checkout
2. `docker compose up` — API responds at `http://localhost:8000/docs`
3. Edit a source file on the host — uvicorn logs a reload inside the container
4. Remove `SECRET_KEY` from `.env` — container exits with a Pydantic validation error
