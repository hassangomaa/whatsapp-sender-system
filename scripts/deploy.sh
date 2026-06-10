#!/usr/bin/env bash
# Production deploy via Docker Compose.
# Usage:
#   cp .env.example .env   # edit secrets first
#   bash scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

if [ ! -f .env ]; then
  echo "❌ Missing .env — copy .env.example and set production secrets."
  exit 1
fi

if [ "$JWT_SECRET" = "change-me-in-production-min-32-chars" ]; then
  echo "❌ Set a strong JWT_SECRET in .env before deploying."
  exit 1
fi

COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.prod.yml}"
PROFILE="${COMPOSE_PROFILE:-}"

echo "==> Building images..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES ${PROFILE:+--profile "$PROFILE"} build

echo "==> Starting infrastructure..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES ${PROFILE:+--profile "$PROFILE"} up -d postgres redis

echo "==> Waiting for Postgres..."
for i in $(seq 1 30); do
  # shellcheck disable=SC2086
  if docker compose $COMPOSE_FILES exec -T postgres pg_isready -U whatsapp -d whatsapp_sender &>/dev/null; then
    break
  fi
  sleep 2
done

echo "==> Starting application services..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES ${PROFILE:+--profile "$PROFILE"} up -d api worker web

echo "==> Running database migrations..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES exec -T api sh -c \
  "cd /app && npm run db:push -w @whatsapp-sender/database"

echo "==> Seeding plans (idempotent)..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES exec -T api sh -c \
  "cd /app && npm run seed -w @whatsapp-sender/database" || true

echo "==> Health checks..."
API_HEALTH="${NEXT_PUBLIC_API_URL:-http://localhost:3010}/health"
for i in $(seq 1 20); do
  if curl -sf "$API_HEALTH" >/dev/null 2>&1; then
    echo "✅ API healthy: $API_HEALTH"
    break
  fi
  sleep 3
done

WEB_URL="${NEXT_PUBLIC_WEB_URL:-http://localhost:3011}"
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Deploy complete                                         ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Dashboard : $WEB_URL"
echo "║  API       : ${NEXT_PUBLIC_API_URL:-http://localhost:3010}"
echo "║  Logs      : docker compose logs -f api worker web"
echo "╚══════════════════════════════════════════════════════════╝"
