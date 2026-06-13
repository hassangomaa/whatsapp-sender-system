#!/usr/bin/env bash
# Production auth + CORS smoke — run on VPS or against public URLs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

API="${NEXT_PUBLIC_API_URL:-https://api.whatsapp.arheb.net}"
WEB="${NEXT_PUBLIC_WEB_URL:-https://whatsapp.arheb.net}"

echo "=== API health ==="
curl -sf "$API/health" | head -c 500
echo ""

echo "=== CORS preflight (login) ==="
CORS_HEADERS=$(curl -s -D - -o /dev/null -X OPTIONS "$API/api/v1/auth/login" \
  -H "Origin: $WEB" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" || true)
echo "$CORS_HEADERS" | grep -i "access-control-allow-origin" || {
  echo "❌ Missing Access-Control-Allow-Origin for $WEB"
  exit 1
}
echo "✅ CORS headers present"

echo "=== Login endpoint reachable ==="
EMAIL="probe-$(date +%s)@example.com"
REG=$(curl -sf -X POST "$API/api/v1/auth/register" \
  -H "Origin: $WEB" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"ProbeTest123!\",\"name\":\"Probe\"}")
echo "$REG" | python3 -c "import sys,json; json.load(sys.stdin)['token']" >/dev/null
echo "✅ Register OK"

LOGIN=$(curl -sf -X POST "$API/api/v1/auth/login" \
  -H "Origin: $WEB" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"ProbeTest123!\"}")
echo "$LOGIN" | python3 -c "import sys,json; json.load(sys.stdin)['token']" >/dev/null
echo "✅ Login OK"

echo ""
echo "✅ Production auth smoke passed (API=$API WEB=$WEB)"
