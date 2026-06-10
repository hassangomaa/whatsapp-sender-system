#!/usr/bin/env bash
# OTP signup smoke (requires OTP_DEV_MODE=1 on API).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

API="${API_URL:-$NEXT_PUBLIC_API_URL:-http://localhost:3010}"
PHONE="${SMOKE_PHONE:-201299988877}"

echo "==> Request OTP for +$PHONE"
curl -sf -X POST "$API/api/v1/auth/otp/request" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PHONE\"}" && echo ""

sleep 1
CODE=$(curl -sf "$API/api/v1/auth/otp/peek?phone=$PHONE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))")
if [[ -z "$CODE" ]]; then
  echo "❌ No OTP code (set OTP_DEV_MODE=1)"
  exit 1
fi

echo "==> Verify OTP"
RES=$(curl -sf -X POST "$API/api/v1/auth/otp/verify" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PHONE\",\"code\":\"$CODE\",\"name\":\"Smoke OTP\"}")
echo "$RES" | python3 -c "import sys,json; assert json.load(sys.stdin)['token']; print('OK: token issued')"

echo "✅ OTP register smoke passed"
