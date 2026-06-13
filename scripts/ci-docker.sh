#!/usr/bin/env bash
# Build production Docker images exactly as VPS does — catches Dockerfile / build-arg issues.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

if [ -f "$ROOT/.env" ]; then
  # shellcheck disable=SC1091
  source "$ROOT/scripts/load-env.sh"
fi

export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.whatsapp.arheb.net}"
export NEXT_PUBLIC_WEB_URL="${NEXT_PUBLIC_WEB_URL:-https://whatsapp.arheb.net}"

echo "==> Docker build (api, worker, web) with production overlay ..."
docker compose $COMPOSE_FILES build api worker web

echo ""
echo "✅ Docker images built successfully."
