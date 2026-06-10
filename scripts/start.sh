#!/usr/bin/env bash
# Start production servers (run after: npm run build).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

export BAILEYS_MOCK=0
export NODE_ENV=production

if [ ! -f apps/api/dist/main.js ] || [ ! -f apps/worker/dist/index.js ]; then
  echo "❌ Missing build output. Run first: npm run build"
  exit 1
fi

if [ ! -d apps/web/.next ]; then
  echo "❌ Missing web build. Run first: npm run build"
  exit 1
fi

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  WhatsApp Sender — running (production)                  ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Dashboard : $NEXT_PUBLIC_WEB_URL"
echo "║  API       : $NEXT_PUBLIC_API_URL"
echo "║  Mock QR   : BAILEYS_MOCK=0"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

npx concurrently -k -n api,worker,web -c blue,magenta,green \
  "npm run start -w @whatsapp-sender/api" \
  "npm run start -w @whatsapp-sender/worker" \
  "npm run start -w @whatsapp-sender/web"
