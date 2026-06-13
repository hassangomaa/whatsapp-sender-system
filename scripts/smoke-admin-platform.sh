#!/usr/bin/env bash
# Smoke platform admin API — requires PLATFORM_ADMIN_EMAILS user + running API.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

API="${NEXT_PUBLIC_API_URL:-http://localhost:3010}"
ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL:-${PLATFORM_ADMIN_EMAILS%%,*}}"
ADMIN_PASSWORD="${SMOKE_ADMIN_PASSWORD:-SmokeTest123!}"

if [ -z "$ADMIN_EMAIL" ]; then
  echo "❌ Set PLATFORM_ADMIN_EMAILS or SMOKE_ADMIN_EMAIL"
  exit 1
fi

echo "=== Login as platform admin ($ADMIN_EMAIL) ==="
LOGIN=$(curl -sf -X POST "$API/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || echo "")

if ! echo "$LOGIN" | python3 -c "import sys,json; json.load(sys.stdin)['token']" 2>/dev/null; then
  echo "❌ Admin login failed — register user first or set SMOKE_ADMIN_PASSWORD"
  exit 1
fi

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== GET /api/v1/admin/platform ==="
PLATFORM=$(curl -sf "$API/api/v1/admin/platform" -H "Authorization: Bearer $TOKEN")
echo "$PLATFORM" | python3 -c "import sys,json; json.load(sys.stdin)['platformWorkspaceId']" >/dev/null
echo "✅ Platform admin config readable"

echo "=== GET /auth/me isPlatformAdmin ==="
ME=$(curl -sf "$API/api/v1/auth/me" -H "Authorization: Bearer $TOKEN")
echo "$ME" | python3 -c "import sys,json; assert json.load(sys.stdin).get('isPlatformAdmin') is True"
echo "✅ isPlatformAdmin true"

echo ""
echo "✅ Platform admin smoke passed"
