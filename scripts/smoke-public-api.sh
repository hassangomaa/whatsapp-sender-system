#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3010}"
EMAIL="${SMOKE_EMAIL:-smoke-$(date +%s)@example.com}"
PASSWORD="${SMOKE_PASSWORD:-SmokeTest123!}"

echo "==> Register"
REGISTER=$(curl -s -X POST "$API_URL/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Smoke Test\"}")
TOKEN=$(echo "$REGISTER" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "==> Create session"
SESSION=$(curl -s -X POST "$API_URL/api/v1/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"SmokeSession"}')
API_KEY=$(echo "$SESSION" | python3 -c "import sys,json; print(json.load(sys.stdin)['apiKey'])")
SESSION_ID=$(echo "$SESSION" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo "==> Init session (mock mode connects in ~3s)"
curl -s -X POST "$API_URL/api/v1/sessions/$SESSION_ID/init" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
sleep 5

echo "==> Public send"
SEND=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/whatsapp/public/message/send" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $API_KEY" \
  -H 'Idempotency-Key: smoke-test-001' \
  -d '{"phoneNumber":"201277785111","content":"Smoke test from WhatsApp Sender"}')
HTTP_CODE=$(echo "$SEND" | tail -n1)
BODY=$(echo "$SEND" | sed '$d')

if [[ "$HTTP_CODE" != "201" && "$HTTP_CODE" != "200" ]]; then
  echo "FAIL: HTTP $HTTP_CODE — $BODY"
  exit 1
fi

echo "OK: $BODY"
echo "Smoke test passed."
