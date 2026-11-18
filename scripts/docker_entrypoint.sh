#!/bin/sh
set -e

echo "[lmcpafm] Running database migrations..."
alembic upgrade head

echo "[lmcpafm] Starting API on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"