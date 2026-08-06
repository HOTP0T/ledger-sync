#!/bin/sh
set -e

# Prepare the database only for the API process (mirrors the other modules'
# entrypoints, which skip DB work for non-uvicorn commands).
if echo "$@" | grep -q "uvicorn"; then
  # ledger-sync's historical migration chain contains data migrations that were
  # written for its SQLite dev DB and fail on a fresh Postgres (e.g. comparing an
  # enum column to a non-label literal). For a FRESH module database we therefore
  # build the current schema straight from the SQLAlchemy models and stamp Alembic
  # at head, skipping those meaningless-on-empty historical data steps. A database
  # already under Alembic control upgrades normally, so future migrations apply.
  HAS_ALEMBIC=$(uv run python -c "from sqlalchemy import inspect; from ledger_sync.db.session import engine; print('yes' if 'alembic_version' in inspect(engine).get_table_names() else 'no')")
  if [ "$HAS_ALEMBIC" = "yes" ]; then
    echo "[entrypoint] existing database -> alembic upgrade head"
    uv run alembic upgrade head
  else
    echo "[entrypoint] fresh database -> create schema from models + stamp head"
    uv run python -c "from ledger_sync.db.session import init_db; init_db()"
    uv run alembic stamp head
  fi
  echo "[entrypoint] database ready."
fi

exec "$@"
