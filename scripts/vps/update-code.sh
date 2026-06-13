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

echo "==> Starting infrastructure ..."
docker compose $COMPOSE_FILES up -d postgres redis
sleep 3

echo "==> Database migrate (before api start) ..."
bash "$ROOT/scripts/db-migrate.sh"

echo "==> Starting application services ..."
docker compose $COMPOSE_FILES up -d api worker web

echo "==> Waiting for API ..."
LOCAL_API="http://127.0.0.1:${API_HOST_PORT:-3020}/health"
for _ in $(seq 1 30); do
  if curl -sf "$LOCAL_API" >/dev/null 2>&1; then
    echo "✅ API healthy: $LOCAL_API"
    break
  fi
  sleep 3
done
curl -sf "$LOCAL_API" || {
  echo "❌ API not healthy — recent logs:"
  docker compose $COMPOSE_FILES logs --tail=40 api
  exit 1
}
echo ""

echo "==> Public health ..."
curl -sf "${NEXT_PUBLIC_API_URL}/health" && echo ""

echo "==> Auth + CORS smoke ..."
bash "$ROOT/scripts/smoke-auth-production.sh"

echo ""
echo "✅ Update complete"
echo "   Dashboard: ${NEXT_PUBLIC_WEB_URL}"
echo "   API:       ${NEXT_PUBLIC_API_URL}/health"
