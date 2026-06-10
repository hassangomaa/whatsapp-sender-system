#!/usr/bin/env bash
# Load Whatsapp-Bot/.env into the current shell (with safe defaults).
# Usage: source scripts/load-env.sh

_load_env_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "$_load_env_root/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$_load_env_root/.env"
  set +a
fi

export DATABASE_URL="${DATABASE_URL:-postgresql://whatsapp:whatsapp@localhost:5432/whatsapp_sender}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export JWT_SECRET="${JWT_SECRET:-change-me-in-production-min-32-chars}"
export JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}"
export API_PORT="${API_PORT:-3010}"
export API_HOST_PORT="${API_HOST_PORT:-3020}"
export WEB_HOST_PORT="${WEB_HOST_PORT:-3021}"
export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:3011}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3010}"
export NEXT_PUBLIC_WEB_URL="${NEXT_PUBLIC_WEB_URL:-http://localhost:3011}"
export BAILEYS_MOCK="${BAILEYS_MOCK:-0}"
export WORKER_CONCURRENCY="${WORKER_CONCURRENCY:-5}"
export WEBHOOK_SIGNING_SECRET="${WEBHOOK_SIGNING_SECRET:-change-me-webhook-secret}"

unset _load_env_root
