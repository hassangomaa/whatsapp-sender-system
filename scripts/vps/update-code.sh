#!/usr/bin/env bash
# Safe VPS code update — never run npm on host; migrate inside Docker.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

echo "==> Ensuring .env ..."
bash "$ROOT/scripts/vps/ensure-env.sh"
# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

if [ -d .git ]; then
  echo "==> git pull ..."
  git pull --ff-only origin main
fi

echo "==> Building (web gets NEXT_PUBLIC_* from .env) ..."
docker compose $COMPOSE_FILES build api worker web

echo "==> Starting services ..."
docker compose $COMPOSE_FILES up -d postgres redis
sleep 3
docker compose $COMPOSE_FILES up -d api worker web

echo "==> Database migrate (inside api container) ..."
bash "$ROOT/scripts/db-migrate.sh"

echo "==> Health checks ..."
curl -sf "http://127.0.0.1:${API_HOST_PORT:-3020}/health" && echo ""
curl -sf "${NEXT_PUBLIC_API_URL}/health" && echo ""

echo "==> Auth + CORS smoke ..."
bash "$ROOT/scripts/smoke-auth-production.sh"

echo ""
echo "✅ Update complete"
echo "   Dashboard: ${NEXT_PUBLIC_WEB_URL}"
echo "   API:       ${NEXT_PUBLIC_API_URL}/health"
