#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  WhatsApp Sender — local development                     ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Dashboard : $NEXT_PUBLIC_WEB_URL"
echo "║  API       : $NEXT_PUBLIC_API_URL"
echo "║  Health    : $NEXT_PUBLIC_API_URL/health"
echo "║  Mock QR   : BAILEYS_MOCK=$BAILEYS_MOCK"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if ! command -v psql &>/dev/null; then
  echo "⚠️  PostgreSQL CLI not found. Run: bash scripts/setup-local.sh"
elif ! psql "$DATABASE_URL" -c 'SELECT 1' &>/dev/null; then
  echo "⚠️  Cannot reach database. Run: bash scripts/setup-local.sh"
fi

export BAILEYS_MOCK="${BAILEYS_MOCK:-0}"

echo "==> Cleaning stale Next.js cache..."
rm -rf apps/web/.next

echo "==> Building API & worker (required for nest start --watch)..."
npm run build -w @whatsapp-sender/contracts -w @whatsapp-sender/database
npm run build -w @whatsapp-sender/api -w @whatsapp-sender/worker

echo "==> Starting api, worker, web..."
exec npx concurrently -n api,worker,web -c blue,magenta,green \
  "npm run dev -w @whatsapp-sender/api" \
  "npm run dev -w @whatsapp-sender/worker" \
  "npm run dev -w @whatsapp-sender/web"
