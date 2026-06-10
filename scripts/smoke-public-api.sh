#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

API_URL="${API_URL:-$NEXT_PUBLIC_API_URL}"

if ! curl -sf "$API_URL/health" >/dev/null; then
  echo "❌ API not reachable at $API_URL"
  echo "   Start first: npm run build && npm run start"
  exit 1
fi

MOCK=$(curl -sf "$API_URL/health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('capabilities',{}).get('baileysMock', False))" 2>/dev/null || echo "False")
EMAIL="${SMOKE_EMAIL:-smoke-$(date +%s)@example.com}"
PASSWORD="${SMOKE_PASSWORD:-SmokeTest123!}"

echo "==> Register"
REGISTER=$(curl -s -X POST "$API_URL/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Smoke Test\"}")
if ! echo "$REGISTER" | python3 -c "import sys,json; json.load(sys.stdin)['token']" 2>/dev/null; then
  echo "FAIL: register — $REGISTER"
  exit 1
fi
TOKEN=$(echo "$REGISTER" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "OK: registered $EMAIL"

echo "==> Create session"
SESSION=$(curl -s -X POST "$API_URL/api/v1/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"SmokeSession"}')
API_KEY=$(echo "$SESSION" | python3 -c "import sys,json; print(json.load(sys.stdin)['apiKey'])")
SESSION_ID=$(echo "$SESSION" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "OK: session $SESSION_ID"

echo "==> Init session"
curl -sf -X POST "$API_URL/api/v1/sessions/$SESSION_ID/init" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

if [[ "$MOCK" == "True" ]]; then
  echo "   (mock mode — waiting ~5s for auto-connect)"
  sleep 5
else
  echo "   (real mode — checking connection; scan QR at http://localhost:3011/sessions/$SESSION_ID if needed)"
  sleep 3
  STATUS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/sessions/$SESSION_ID" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
  if [[ "$STATUS" != "connected" ]]; then
    echo "⚠️  Session not connected yet (status: ${STATUS:-unknown}) — skipping send/webhook."
    echo "   Scan QR then re-run: npm run smoke:public-api"
    exit 0
  fi
fi

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

echo "==> Enable webhook scope"
curl -sf -X PATCH "$API_URL/api/v1/sessions/$SESSION_ID/scopes" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"webhook":true,"webhookUrl":"https://httpbin.org/post"}' > /dev/null

echo "==> Test webhook"
TEST=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/webhooks/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"sessionId\":\"$SESSION_ID\"}")
TEST_CODE=$(echo "$TEST" | tail -n1)
if [[ "$TEST_CODE" != "201" && "$TEST_CODE" != "200" ]]; then
  echo "WARN: webhook test HTTP $TEST_CODE (worker may still be processing)"
fi

sleep 3

echo "==> List webhook deliveries"
DELIVERIES=$(curl -s "$API_URL/api/v1/webhooks/deliveries?limit=5" \
  -H "Authorization: Bearer $TOKEN")
echo "$DELIVERIES" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d) >= 1, 'expected delivery row'; print('OK: webhook deliveries', len(d))"

echo "Smoke test passed."
