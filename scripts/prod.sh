#!/usr/bin/env bash
# Production run — real WhatsApp pairing (BAILEYS_MOCK=0), no demo mode.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

export BAILEYS_MOCK=0
export NODE_ENV=production

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  WhatsApp Sender — PRODUCTION mode                       ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Dashboard : $NEXT_PUBLIC_WEB_URL"
echo "║  API       : $NEXT_PUBLIC_API_URL"
echo "║  Mock QR   : BAILEYS_MOCK=0 (real WhatsApp scan)"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

echo "==> Full production build (no mock, fresh compile)..."
rm -rf apps/web/.next apps/api/dist apps/api/tsconfig.tsbuildinfo apps/worker/dist
npm run build

exec bash "$ROOT/scripts/start.sh"
