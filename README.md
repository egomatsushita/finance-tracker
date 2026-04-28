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

## Roadmap

- [x] Initial setup - Install uv, fastapi, uvicorn, alembic
- [x] User model, repository, service and router
- [x] Auth service and router
- [x] Transaction model, repository, service and router
- [x] Tests
- [x] Centralized logging
- [x] GitHub actions - runs pytest and ruff on every push
- [x] Docker + docker-compose
