# Spec for Docker Local Dev

branch: FT-28_docker-local-dev

## Summary

Add a `Dockerfile` and `docker-compose.yml` to run the finance-tracker API locally in a container. Targeted at development use only — no production hardening, multi-stage builds, or non-root user setup required.

## Functional Requirements

- A `Dockerfile` builds an image that runs the FastAPI app via `uv run app/main.py`.
- The `Dockerfile` installs dependencies using `uv sync` inside the image.
- A `docker-compose.yml` defines a single `app` service built from the local `Dockerfile`.
- The compose file maps the container's app port to the host so the API is reachable at `localhost`.
- The compose file mounts the project source directory into the container so code changes reflect without rebuilding the image.
- Environment variables (at minimum `SECRET_KEY`) are supplied via a `.env` file loaded by compose.
- The `.env` file is already git-ignored; the spec does not require a `.env.example` file.
- `docker compose up` starts the server with hot-reload enabled.

## Possible Edge Cases

- `uv` must be available inside the image — the base image should include it or it must be installed explicitly.
- The app's `pythonpath` is set to `app/` (see `pyproject.toml`) — the working directory or entrypoint must account for this.
- The SQLite database file path (`database.db`) defaults to the project root; with a volume mount this will be written to the host, which is acceptable for local dev.
- Hot-reload (uvicorn `--reload`) watches the filesystem — the volume mount must propagate file change events correctly on macOS (Docker Desktop handles this).
- Port conflicts: the default port (`8000`) may already be in use on the host.

## Acceptance Criteria

- `docker compose up` starts the app and the API is reachable at `http://localhost:8000`.
- Editing a source file on the host triggers uvicorn to reload inside the container.
- `SECRET_KEY` and other settings are read from the `.env` file without hardcoding values in the compose file.
- The image builds successfully from a clean checkout using only `docker compose build`.

## Open Questions

- Should the compose file define a named volume for the SQLite database file, or is a bind mount to the host sufficient? just bind mount to the host.
- Should `docker-compose.yml` use the `compose` v2 spec (no `version:` key) or include a `version:` field for broader compatibility? no version.

## Testing Guidelines

This feature adds infrastructure files only — there is no application code to unit-test. Verification is manual:

- Run `docker compose build` and confirm it completes without errors.
- Run `docker compose up` and confirm the API responds at `http://localhost:8000/docs`.
- Edit a source file and confirm uvicorn logs a reload.
- Confirm that omitting `SECRET_KEY` from `.env` causes the container to exit with a clear validation error.
