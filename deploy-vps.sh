#!/usr/bin/env bash
# Fully automated VPS deploy for srv851550 (whatsapp.arheb.net).
# Usage: sudo ./deploy-vps.sh full
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
APP_DIR="${APP_DIR:-/var/www/whatsapp-sender}"

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "==> Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "❌ Docker Compose plugin not found."
    exit 1
  fi
}

ensure_env() {
  echo "==> Ensuring VPS .env (auto secrets + hardcoded arheb.net URLs)..."
  bash "$ROOT/scripts/vps/ensure-env.sh"
  # shellcheck disable=SC1091
  source "$ROOT/scripts/load-env.sh"
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
  compose logs --tail=50 api
  exit 1
}

run_migrate_seed() {
  bash "$ROOT/scripts/db-migrate.sh"
}

setup_nginx_ssl() {
  if [ "$(id -u)" -eq 0 ]; then
    bash "$ROOT/scripts/vps/setup-nginx.sh"
  else
    echo "⚠️  Run as root for nginx/SSL: sudo ./deploy-vps.sh ssl"
  fi
}

cmd_ssl() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "❌ Run: sudo ./deploy-vps.sh ssl"
    exit 1
  fi
  bash "$ROOT/scripts/vps/setup-nginx.sh"
  bash "$ROOT/scripts/vps/verify-production.sh"
}

cmd_full() {
  require_docker
  ensure_env

  LOCAL_API_PORT="${API_HOST_PORT:-3020}"
  WEB_URL="${NEXT_PUBLIC_WEB_URL:-https://whatsapp.arheb.net}"
  API_URL="${NEXT_PUBLIC_API_URL:-https://api.whatsapp.arheb.net}"

  echo "==> Building images..."
  compose build

  echo "==> Starting infrastructure..."
  compose up -d postgres redis
  wait_postgres

  echo "==> Starting application services..."
  run_migrate_seed
  compose up -d api worker web

  wait_api "http://127.0.0.1:${LOCAL_API_PORT}/health"

  setup_nginx_ssl

  echo ""
  echo "==> Production verify + smoke tests..."
  if bash "$ROOT/scripts/vps/verify-production.sh" && \
     NEXT_PUBLIC_WEB_URL="$WEB_URL" NEXT_PUBLIC_API_URL="$API_URL" bash "$ROOT/scripts/smoke-all.sh"; then
    echo "✅ All checks passed"
  else
    echo "⚠️  Some checks failed — try: sudo ./deploy-vps.sh ssl"
  fi

  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  Full deploy complete                                    ║"
  echo "╠══════════════════════════════════════════════════════════╣"
  echo "║  Dashboard : $WEB_URL"
  echo "║  API       : $API_URL"
  echo "║  Health    : $API_URL/health"
  echo "╚══════════════════════════════════════════════════════════╝"
}

cmd_code() {
  require_docker
  ensure_env
  LOCAL_API_PORT="${API_HOST_PORT:-3020}"

  if [ -d .git ]; then
    echo "==> Pulling latest code..."
    git pull --ff-only
  fi

  compose build
  compose up -d postgres redis
  wait_postgres
  run_migrate_seed
  compose up -d api worker web
  wait_api "http://127.0.0.1:${LOCAL_API_PORT}/health"
  setup_nginx_ssl
  bash "$ROOT/scripts/smoke-auth-production.sh" || echo "⚠️  Auth smoke failed — check CORS and API logs"
  echo "✅ Code deploy complete."
}

cmd_migrate() {
  require_docker
  ensure_env
  compose up -d postgres redis api
  wait_postgres
  run_migrate_seed
  echo "✅ Migrations complete."
}

cmd_test() {
  ensure_env
  WEB_URL="${NEXT_PUBLIC_WEB_URL:-https://whatsapp.arheb.net}"
  API_URL="${NEXT_PUBLIC_API_URL:-https://api.whatsapp.arheb.net}"
  echo "==> Smoke tests (WEB=$WEB_URL API=$API_URL)"
  NEXT_PUBLIC_WEB_URL="$WEB_URL" NEXT_PUBLIC_API_URL="$API_URL" \
    bash "$ROOT/scripts/smoke-all.sh"
}

cmd_status() {
  require_docker
  ensure_env
  LOCAL_API_PORT="${API_HOST_PORT:-3020}"
  API_URL="${NEXT_PUBLIC_API_URL:-https://api.whatsapp.arheb.net}"
  compose ps
  echo ""
  curl -sf "http://127.0.0.1:${LOCAL_API_PORT}/health" && echo "" || echo "❌ Local API down"
  curl -sf "$API_URL/health" && echo "" || echo "⚠️  Public API unreachable"
}

cmd_logs() {
  require_docker
  compose logs -f api worker web
}

usage() {
  cat <<EOF
Usage: sudo ./deploy-vps.sh <command>

Commands:
  full     Zero-config deploy (env + docker + db + nginx/ssl + smoke)
  code     git pull + rebuild + migrate
  migrate  DB push + seed only (fix missing tables)
  ssl      Fix/reinstall HTTPS nginx + cert verify
  test     Smoke tests
  status   Containers + health
  logs     Tail api/worker/web

No manual .env editing required — secrets auto-generated and saved to .env.secrets
EOF
}

CMD="${1:-}"
case "$CMD" in
  full)    cmd_full ;;
  code)    cmd_code ;;
  migrate) cmd_migrate ;;
  ssl)     cmd_ssl ;;
  test)    cmd_test ;;
  status)  cmd_status ;;
  logs)    cmd_logs ;;
  *)       usage; exit 1 ;;
esac
