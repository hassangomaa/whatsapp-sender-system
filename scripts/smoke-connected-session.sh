#!/usr/bin/env bash
# Verifies a mock-connected session survives worker process recycle (restorePersistedSessions).
# Requires: API + worker + Redis + Postgres running with BAILEYS_MOCK=1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

API_URL="${API_URL:-$NEXT_PUBLIC_API_URL}"
POLL_SECONDS="${SMOKE_RESTORE_TIMEOUT:-90}"

if ! curl -sf "$API_URL/health" >/dev/null; then
  echo "❌ API not reachable at $API_URL"
  exit 1
fi

MOCK=$(curl -sf "$API_URL/health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('capabilities',{}).get('baileysMock', False))" 2>/dev/null || echo "False")
if [[ "$MOCK" != "True" ]]; then
  echo "⚠️  BAILEYS_MOCK is not enabled — this smoke test requires mock mode."
  echo "   Set BAILEYS_MOCK=1 and restart worker, or run full manual VPS verification."
  exit 0
fi

EMAIL="${SMOKE_EMAIL:-restore-$(date +%s)@example.com}"
PASSWORD="${SMOKE_PASSWORD:-SmokeTest123!}"

echo "==> Register"
REGISTER=$(curl -s -X POST "$API_URL/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Restore Smoke\"}")
TOKEN=$(echo "$REGISTER" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "==> Create + init session"
SESSION=$(curl -s -X POST "$API_URL/api/v1/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"RestoreSmoke"}')
SESSION_ID=$(echo "$SESSION" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -sf -X POST "$API_URL/api/v1/sessions/$SESSION_ID/init" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

echo "==> Wait for mock connect"
for _ in $(seq 1 20); do
  STATUS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/sessions/$SESSION_ID" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
  if [[ "$STATUS" == "connected" ]]; then
    echo "OK: session connected"
    break
  fi
  sleep 1
done
if [[ "${STATUS:-}" != "connected" ]]; then
  echo "FAIL: session never connected (status: ${STATUS:-unknown})"
  exit 1
fi

echo "==> Simulate worker restart (SIGTERM worker dev process if local)"
WORKER_PID=$(pgrep -f "@whatsapp-sender/worker" | head -n1 || true)
if [[ -n "$WORKER_PID" ]]; then
  echo "   Sending SIGTERM to worker pid $WORKER_PID"
  kill -TERM "$WORKER_PID" || true
  sleep 3
  echo "   Restart worker manually if not using dev.sh auto-restart"
else
  if command -v docker >/dev/null && docker compose ps worker 2>/dev/null | grep -q worker; then
    echo "   docker compose restart worker"
    docker compose restart worker
  else
    echo "⚠️  Could not find worker process — skip restart simulation"
    echo "   Run: docker compose restart worker  (or restart dev worker) then re-run this script"
    exit 0
  fi
fi

echo "==> Poll for reconnect (up to ${POLL_SECONDS}s)"
for _ in $(seq 1 "$POLL_SECONDS"); do
  LIVE=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/sessions/$SESSION_ID" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('1' if d.get('liveConnected') or d.get('status')=='connected' else '0')" 2>/dev/null || echo "0")
  if [[ "$LIVE" == "1" ]]; then
    echo "OK: session live after worker recycle"
    exit 0
  fi
  sleep 1
done

echo "FAIL: session not live within ${POLL_SECONDS}s after worker restart"
exit 1
