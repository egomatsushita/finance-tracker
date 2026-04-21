# Personal Financial Tracker API

A RESTful API for tracking personal income, expenses, and budgets. Built with modern async Python patterns and Router &rarr; Service &rarr; Repository architecture.

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

An admin user is created automatically during migration

| Field    | Value   |
| -------- | ------- |
| username | `admin` |
| password | `admin` |

> ⚠️ Change the admin password immediately after first login.

## Roadmap

- [x] Initial setup - Install uv, fastapi, uvicorn, alembic
- [x] User model, repository, service and router
- [x] Auth service and router
- [x] Transaction model, repository, service and router
- [x] Tests
- [ ] GitHub actions - runs pytest and ruff on every push
- [ ] Docker + docker-compose
- [ ] PostgreSQL support
