#!/usr/bin/env bash
# Curl-test all public pages and API health/auth endpoints.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

API="${NEXT_PUBLIC_API_URL:-http://localhost:3010}"
WEB="${NEXT_PUBLIC_WEB_URL:-http://localhost:3011}"
PASS=0
FAIL=0

if ! curl -sf "$API/health" >/dev/null 2>&1; then
  echo "❌ API not reachable at $API"
  echo "   Start first: npm run build && npm run start"
  echo "   (keep that terminal open, then run: npm run smoke:all)"
  exit 1
fi

check() {
  local name="$1" url="$2" expect="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
  if [[ "$code" == "$expect" ]]; then
    echo "✅ $name ($code)"
    PASS=$((PASS + 1))
  else
    echo "❌ $name — expected $expect, got $code — $url"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== API ==="
check "GET /health" "$API/health"
HEALTH=$(curl -sf "$API/health" 2>/dev/null || echo "{}")
echo "   $HEALTH"

echo ""
echo "=== Web pages ==="
PAGES=(
  "/"
  "/login"
  "/register"
  "/dashboard"
  "/getting-started"
  "/sessions"
  "/messages"
  "/campaigns"
  "/webhooks"
  "/packages"
  "/docs"
  "/settings"
  "/status"
)

for p in "${PAGES[@]}"; do
  check "GET $p" "$WEB$p"
done

echo ""
echo "=== API auth flow ==="
EMAIL="smoke-$(date +%s)@example.com"
REG=$(curl -sf -X POST "$API/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"SmokeTest123!\",\"name\":\"Smoke\"}" 2>/dev/null || echo "")
if echo "$REG" | python3 -c "import sys,json; json.load(sys.stdin)['token']" 2>/dev/null; then
  echo "✅ POST /api/v1/auth/register"
  PASS=$((PASS + 1))
  TOKEN=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
  ME_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/api/v1/auth/me")
  if [[ "$ME_CODE" == "200" ]]; then echo "✅ GET /api/v1/auth/me ($ME_CODE)"; PASS=$((PASS+1)); else echo "❌ GET /api/v1/auth/me ($ME_CODE)"; FAIL=$((FAIL+1)); fi
  DASH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/api/v1/dashboard")
  if [[ "$DASH_CODE" == "200" ]]; then echo "✅ GET /api/v1/dashboard ($DASH_CODE)"; PASS=$((PASS+1)); else echo "❌ GET /api/v1/dashboard ($DASH_CODE)"; FAIL=$((FAIL+1)); fi
  SESS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/api/v1/sessions")
  if [[ "$SESS_CODE" == "200" ]]; then echo "✅ GET /api/v1/sessions ($SESS_CODE)"; PASS=$((PASS+1)); else echo "❌ GET /api/v1/sessions ($SESS_CODE)"; FAIL=$((FAIL+1)); fi
else
  echo "❌ POST /api/v1/auth/register"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== Summary: $PASS passed, $FAIL failed ==="
[[ "$FAIL" -eq 0 ]]
