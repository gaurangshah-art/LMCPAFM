# Deployment Runbook

This runbook covers the exact backend migration commands for:

- a new environment with an empty database
- an existing environment that already has the current schema but no Alembic history yet

Examples below use PowerShell and the repository virtual environment.

## Required Environment Variables

Set these before running migrations or starting the backend:

```powershell
$env:DATABASE_URL = "sqlite:///database/LMCPAFM.db"
$env:JWT_SECRET_KEY = "replace-with-a-real-secret"
$env:JWT_EXPIRE_MINUTES = "60"
$env:CORS_ALLOW_ORIGINS = "https://your-frontend.example.com"
```

For PostgreSQL, set `DATABASE_URL` to a SQLAlchemy-compatible connection string such as:

```powershell
$env:DATABASE_URL = "postgresql+psycopg://user:password@host:5432/lmcpafm"
```

## Install Dependencies

```powershell
Set-Location C:/LMCPAFM
./.venv-1/Scripts/python.exe -m pip install -r requirements.txt
```

## Backend Environment File

Copy `.env.example` to `.env` and fill in production values before deployment.

The sample `.env.example` uses `sqlite:////data/LMCPAFM.db` so the compose deployment stores SQLite data in a named Docker volume instead of the container filesystem.

```powershell
Set-Location C:/LMCPAFM
Copy-Item .env.example .env
```

## New Environment

Use this when the target database is empty and has no application tables yet.

1. Apply the full schema baseline:

```powershell
Set-Location C:/LMCPAFM
./.venv-1/Scripts/python.exe -m alembic upgrade head
```

2. Start the backend:

```powershell
Set-Location C:/LMCPAFM
./.venv-1/Scripts/python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Existing Environment Without Alembic History

Use this only when the database already contains the current LMCPAFM schema and data, but does not yet have an `alembic_version` table.

1. Back up the database first.

2. Stamp the current schema as the Alembic baseline without changing tables:

```powershell
Set-Location C:/LMCPAFM
./.venv-1/Scripts/python.exe -m alembic stamp head
```

3. For all future releases, apply migrations normally:

```powershell
Set-Location C:/LMCPAFM
./.venv-1/Scripts/python.exe -m alembic upgrade head
```

4. Start the backend:

```powershell
Set-Location C:/LMCPAFM
./.venv-1/Scripts/python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Bootstrap The First User

Use the bootstrap script after migrations complete to create the initial account for a fresh deployment.

```powershell
Set-Location C:/LMCPAFM
./.venv-1/Scripts/python.exe scripts/bootstrap_first_user.py \
	--name "Initial Staff" \
	--email "admin@example.com" \
	--password "replace-with-a-strong-password" \
	--roles "staff,iaec"
```

If the user already exists and should be updated in place, add `--update-if-exists`.

## Check Migration State

Show the current database revision:

```powershell
Set-Location C:/LMCPAFM
./.venv-1/Scripts/python.exe -m alembic current
```

Show available revisions:

```powershell
Set-Location C:/LMCPAFM
./.venv-1/Scripts/python.exe -m alembic history
```

## Frontend Build

Build the frontend before deploying static assets:

```powershell
Set-Location C:/LMCPAFM/frontend
npm install
npm run build
```

Set the frontend API target at build time:

```powershell
$env:VITE_API_BASE_URL = "https://your-backend.example.com"
```

## Backend Docker Build

Build the backend image from the repository root:

```powershell
Set-Location C:/LMCPAFM
docker build -t lmcpafm-backend .
```

Run the backend container with the environment file:

```powershell
Set-Location C:/LMCPAFM
docker run --rm -p 8000:8000 --env-file .env lmcpafm-backend
```

The container startup command runs `alembic upgrade head` before starting Uvicorn.

The image also includes a Docker healthcheck that probes `GET /health/ready` on the local container port.

The backend now exposes three health endpoints:

- `GET /health/live` for process liveness
- `GET /health/ready` for database-aware readiness
- `GET /health` for a simple combined app status payload

## Backend Docker Compose

Bring up the backend with the production compose file:

```powershell
Set-Location C:/LMCPAFM
docker compose up -d --build
```

Inspect service health:

```powershell
Set-Location C:/LMCPAFM
docker compose ps
```

Stop the stack:

```powershell
Set-Location C:/LMCPAFM
docker compose down
```

## Backend Docker Compose With PostgreSQL

Use the PostgreSQL override if you want the containerized deployment to run against Postgres instead of SQLite.

Bring up the backend and database:

```powershell
Set-Location C:/LMCPAFM
docker compose -f compose.yaml -f compose.postgres.yaml --env-file .env up -d --build
```

The override adds a `postgres` service and points the backend `DATABASE_URL` at that container.

Stop the PostgreSQL-backed stack:

```powershell
Set-Location C:/LMCPAFM
docker compose -f compose.yaml -f compose.postgres.yaml down
```

## Full-Stack Development Compose

Use the dev override to run the backend and Vite frontend together for local development.

```powershell
Set-Location C:/LMCPAFM
docker compose -f compose.yaml -f compose.dev.yaml --env-file .env.example up --build
```

This exposes:

- backend on `http://localhost:8000`
- frontend on `http://localhost:5173`

The frontend waits for the backend service to become healthy before starting.

Stop the dev stack:

```powershell
Set-Location C:/LMCPAFM
docker compose -f compose.yaml -f compose.dev.yaml down
```

## Full-Stack Production Compose

Use the production frontend override to run the backend and a static frontend container together.

```powershell
Set-Location C:/LMCPAFM
docker compose -f compose.yaml -f compose.prod.yaml --env-file .env up -d --build
```

This exposes:

- backend on `http://localhost:8000`
- production frontend on `http://localhost:8080`

The frontend image is built from the `frontend` workspace and serves the Vite build through Nginx.

Stop the production web stack:

```powershell
Set-Location C:/LMCPAFM
docker compose -f compose.yaml -f compose.prod.yaml down
```

## Important Notes

- Do not run `alembic stamp head` on a brand-new empty database. Use `alembic upgrade head` instead.
- Do not run `alembic upgrade head` against an old pre-Alembic database unless you have either stamped it already or verified that its schema does not conflict with the baseline migration.
- `alembic stamp head` should be a one-time action for an existing database that already matches the baseline schema.
- Take a backup before stamping or upgrading any database that contains real data.