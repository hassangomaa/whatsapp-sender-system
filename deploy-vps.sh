#!/usr/bin/env bash
# VPS deploy entry point for srv851550 (whatsapp.arheb.net).
# Usage:
#   sudo ./deploy-vps.sh full    # first deploy
#   sudo ./deploy-vps.sh code    # git pull + rebuild
#   sudo ./deploy-vps.sh test    # smoke tests over HTTPS
#   sudo ./deploy-vps.sh status  # containers + /health
#   sudo ./deploy-vps.sh logs    # tail api worker web
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
APP_DIR="${APP_DIR:-/var/www/whatsapp-sender}"

# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

WEB_URL="${NEXT_PUBLIC_WEB_URL:-https://whatsapp.arheb.net}"
API_URL="${NEXT_PUBLIC_API_URL:-https://api.whatsapp.arheb.net}"
LOCAL_API_PORT="${API_HOST_PORT:-3020}"

require_env() {
  if [ ! -f .env ]; then
    echo "❌ Missing .env — run: cp .env.vps.example .env && nano .env"
    exit 1
  fi
  if [ "${JWT_SECRET:-}" = "change-me-in-production-min-32-chars" ] || \
     [ "${JWT_SECRET:-}" = "CHANGE_ME_64_CHAR_RANDOM_SECRET" ]; then
    echo "❌ Set a strong JWT_SECRET in .env before deploying."
    exit 1
  fi
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker not found. Run: sudo bash scripts/vps/bootstrap.sh"
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "❌ Docker Compose plugin not found."
    exit 1
  fi
}

compose() {
  docker compose $COMPOSE_FILES "$@"
}

wait_postgres() {
  echo "==> Waiting for Postgres..."
  for _ in $(seq 1 30); do
    if compose exec -T postgres pg_isready -U whatsapp -d whatsapp_sender &>/dev/null; then
      return 0
    fi
    sleep 2
  done
  echo "❌ Postgres did not become ready in time."
  exit 1
}

wait_api() {
  local health_url="$1"
  echo "==> Waiting for API at $health_url ..."
  for _ in $(seq 1 30); do
    if curl -sf "$health_url" >/dev/null 2>&1; then
      echo "✅ API healthy: $health_url"
      return 0
    fi
    sleep 3
  done
  echo "❌ API not healthy at $health_url"
  echo "   Try: sudo ./deploy-vps.sh logs"
  exit 1
}

run_migrate_seed() {
  echo "==> Running database migrations..."
  compose exec -T api sh -c "cd /app && npm run db:push -w @whatsapp-sender/database"
  echo "==> Seeding plans (idempotent)..."
  compose exec -T api sh -c "cd /app && npm run seed -w @whatsapp-sender/database" || true
}

cmd_full() {
  require_docker
  require_env

  echo "==> Building images..."
  compose build

  echo "==> Starting infrastructure..."
  compose up -d postgres redis
  wait_postgres

  echo "==> Starting application services..."
  compose up -d api worker web
  run_migrate_seed

  # Health via localhost (containers bind 127.0.0.1)
  wait_api "http://127.0.0.1:${LOCAL_API_PORT}/health"

  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  Full deploy complete                                    ║"
  echo "╠══════════════════════════════════════════════════════════╣"
  echo "║  Dashboard : $WEB_URL"
  echo "║  API       : $API_URL"
  echo "║  Next      : enable nginx + certbot if not done yet"
  echo "╚══════════════════════════════════════════════════════════╝"
}

cmd_code() {
  require_docker
  require_env

  if [ -d .git ]; then
    echo "==> Pulling latest code..."
    git pull --ff-only
  fi

  echo "==> Rebuilding images..."
  compose build

  echo "==> Rolling update..."
  compose up -d postgres redis
  wait_postgres
  compose up -d api worker web
  run_migrate_seed

  wait_api "http://127.0.0.1:${LOCAL_API_PORT}/health"
  echo "✅ Code deploy complete."
}

cmd_test() {
  require_env
  echo "==> Smoke tests (WEB=$WEB_URL API=$API_URL)"
  NEXT_PUBLIC_WEB_URL="$WEB_URL" NEXT_PUBLIC_API_URL="$API_URL" \
    bash "$ROOT/scripts/smoke-all.sh"
}

cmd_status() {
  require_docker
  compose ps
  echo ""
  if curl -sf "http://127.0.0.1:${LOCAL_API_PORT}/health" 2>/dev/null; then
    echo ""
    echo "Local health OK (127.0.0.1:${LOCAL_API_PORT})"
  else
    echo "❌ Local API not reachable on 127.0.0.1:${LOCAL_API_PORT}"
  fi
  if curl -sf "$API_URL/health" 2>/dev/null; then
    echo "Public health OK ($API_URL)"
  else
    echo "⚠️  Public API not reachable at $API_URL (check nginx/DNS/SSL)"
  fi
}

cmd_logs() {
  require_docker
  compose logs -f api worker web
}

usage() {
  cat <<EOF
Usage: sudo ./deploy-vps.sh <command>

Commands:
  full    First deploy (build, up, migrate, seed)
  code    git pull + rebuild + migrate
  test    Smoke tests against $WEB_URL
  status  Container status + health checks
  logs    Follow api/worker/web logs

App directory: $ROOT (expected VPS path: $APP_DIR)
EOF
}

CMD="${1:-}"
case "$CMD" in
  full)   cmd_full ;;
  code)   cmd_code ;;
  test)   cmd_test ;;
  status) cmd_status ;;
  logs)   cmd_logs ;;
  *)      usage; exit 1 ;;
esac
