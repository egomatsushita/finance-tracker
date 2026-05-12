# Personal Financial Tracker API

A RESTful API built to learn FastAPI and Pydantic, tracking personal income, expenses, and budgets. Uses modern async Python patterns and a Router &rarr; Service &rarr; Repository architecture.

## Setup & Installation

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/egomatsushita/finance-tracker.git
   cd finance-tracker
   ```

2. **Install dependencies**

   ```bash
   uv sync
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Open `.env` and fill in the required values: `SECRET_KEY` and `DATABASE_URL`

   ```bash
   # generate a secure secret key
   openssl rand -hex 32
   ```

4. **Run migrations**

   ```bash
   uv run alembic upgrade head
   ```

5. **Start the server**

   ```bash
   uv run app/main.py
   ```

   The API will be available at `http://127.0.0.1:8000`.
   Interactive docs at `http://127.0.0.1:8000/redoc`.
   Interactive docs with "Try it out" at `http://127.0.0.1:8000/docs`.

### Default Admin Credentials

Seed users are created automatically during migration to provide a full app experience out of the box. Seed transactions are planned for a future release.

| Role   | Username   | Password   |
| ------ | ---------- | ---------- |
| admin  | `admin`    | `admin`    |
| member | `member`   | `member`   |

## Running with Docker

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Setup

1. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Open `.env` and fill in the required values: `SECRET_KEY` and `DATABASE_URL`

2. **Start the server**

   ```bash
   docker compose up
   ```

   Migrations run automatically on startup. The API will be available at `http://localhost:8000`.
   Interactive docs at `http://localhost:8000/redoc`.
   Interactive docs with "Try it out" at `http://localhost:8000/docs`.

Source code changes on the host are reflected immediately via hot-reload — no rebuild needed.

## Claude Code Skills

Five slash commands are integrated into the development workflow as Claude Code custom commands, covering the full development lifecycle from spec to pull request.

### `/spec` — Feature Spec Generator

Creates a feature spec file and a new Git branch from a short feature description.

Parses the input to extract a feature title, kebab-case slug, and ticket ID (`FT-n`), then switches to a new branch (`FT-n_feature-slug`) and drafts a spec file in `_specs/` following the project template. Aborts if there are uncommitted changes to keep the working tree clean.

**Usage:** `/spec <short feature description>, ticket: FT-n`

### `/commit-message` — Commit Message Generator

Generates a structured commit message from the staged diff.

Analyzes `git diff --staged` and produces a message following the project format: `[FT-n] <type>: <concise description>` with an optional body explaining the *why* behind the change. The ticket number is extracted automatically from the current branch name. Proposes the message and waits for explicit approval before committing.

**Usage:** Stage your changes, then run `/commit-message`.

### `/code-review` — Code Quality Reviewer

Delegates to the `code-quality-reviewer` sub-agent for a staged diff review before committing.

The agent runs `git diff --staged` and evaluates the diff across seven dimensions: security, architecture compliance, error handling, clarity, naming, duplication, and performance. Output is a structured report with severity-ranked issues (Critical, Major, Minor, Suggestion) and a pre-commit checklist.

**Usage:** Stage your changes, then run `/code-review`. Triggered manually — an automatic pre-commit hook was considered but replaced with on-demand invocation for control over when reviews run.

### `/branch-review` — Branch Architect Reviewer

Delegates to the `branch-architect-review` sub-agent for a holistic architectural review of the full branch.

The agent runs `git diff main...HEAD` and analyzes the complete change set across six architectural lenses: layer boundary violations, architectural coherence, cross-file duplication, naming consistency, scope creep, and premature abstractions. Output includes a verdict (Approve / Approve with Suggestions / Needs Revision) and retains institutional memory across reviews via Claude Code's project memory.

**Usage:** Run `/branch-review` at any point during development or before opening a pull request. Initially configured to trigger automatically on every new pull request — switched to on-demand invocation after automatic triggering proved token-intensive at scale.

### `/pull-request` — Pull Request Generator

Generates a pull request title and description from the full branch diff.

Analyzes `git diff main...HEAD` and produces a structured PR body with a summary of what changed and why, plus a per-file change log. The ticket number is extracted from the branch name. Proposes the title and body and waits for explicit approval before running `gh pr create`.

**Usage:** Run `/pull-request` when the branch is ready for review.
