# syntax=docker/dockerfile:1
#
# ledger-sync as a Gnos3-K4mi module: single image that serves both the built
# React SPA (StaticFiles at "/") and the FastAPI backend (/api) on port 8003.

# ── Stage 1: build the React SPA ─────────────────────────────────────────────
FROM node:22 AS frontend
WORKDIR /fe
RUN corepack enable
# Install deps first so this layer is cached unless the lockfile changes.
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
# base stays "/" (GITHUB_PAGES unset) so assets resolve at the container root,
# and VITE_API_BASE_URL stays unset so the SPA calls its own /api same-origin.
# Disable the PWA service worker so an embedded iframe never serves a stale shell.
ENV LEDGER_SYNC_DISABLE_PWA=true
RUN pnpm run build

# ── Stage 2: FastAPI backend (uv) + baked SPA ────────────────────────────────
FROM python:3.12-slim AS backend
# uv provides fast, lockfile-pinned installs.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never
WORKDIR /app

# Install dependencies (cached on the lockfile) without the project itself.
COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-group dev --no-install-project

# Copy the backend source and install the project into the venv.
COPY backend/ ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-group dev

# Bake the built SPA in; the app serves it via LEDGER_SYNC_STATIC_DIR.
COPY --from=frontend /fe/dist ./static

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV LEDGER_SYNC_STATIC_DIR=/app/static
EXPOSE 8003

# Dispatcher health probe hits GET /health; keep start-period generous so the
# first-boot alembic migration (31 revisions) can finish before the probe fails.
HEALTHCHECK --interval=15s --timeout=3s --start-period=90s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8003/health', timeout=2).status==200 else 1)"

ENTRYPOINT ["./entrypoint.sh"]
CMD ["uv", "run", "uvicorn", "ledger_sync.api.main:app", "--host", "0.0.0.0", "--port", "8003"]
