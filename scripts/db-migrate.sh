#!/usr/bin/env bash
# Run Prisma push + seed inside a one-off api container (works even if api service is down).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.prod.yml}"

echo "==> Running database schema push..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES run --rm --no-deps api sh -c \
  "cd /app && npx prisma db push --schema=packages/database/prisma/schema.prisma"

echo "==> Seeding plans (idempotent)..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES run --rm --no-deps api sh -c \
  "cd /app && npm run seed -w @whatsapp-sender/database"

echo "✅ Database ready"
