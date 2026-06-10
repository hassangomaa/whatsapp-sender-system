#!/usr/bin/env bash
# Run Prisma push + seed inside the api container.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.prod.yml}"

echo "==> Running database schema push..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES exec -T api sh -c \
  "cd /app && npm run push -w @whatsapp-sender/database"

echo "==> Seeding plans (idempotent)..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES exec -T api sh -c \
  "cd /app && npm run seed -w @whatsapp-sender/database"

echo "✅ Database ready"
