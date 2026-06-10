#!/usr/bin/env bash
# Curl health + SSL checks for production VPS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

API="${NEXT_PUBLIC_API_URL:-https://api.whatsapp.arheb.net}"
WEB="${NEXT_PUBLIC_WEB_URL:-https://whatsapp.arheb.net}"
LOCAL_API="http://127.0.0.1:${API_HOST_PORT:-3020}"

echo "=== Local API (Docker) ==="
curl -sf "$LOCAL_API/health" && echo "" || { echo "❌ Local API down at $LOCAL_API"; exit 1; }

echo "=== HTTPS health ==="
ok=0
for _ in 1 2 3 4 5; do
  if curl -sf "$API/health" >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done
if [ "$ok" -eq 1 ]; then
  curl -sf "$API/health" && echo ""
else
  echo "❌ HTTPS API failed: $API/health"
  exit 1
fi

echo "=== SSL certificates ==="
for host in whatsapp.arheb.net api.whatsapp.arheb.net; do
  subj=$(echo | openssl s_client -connect "$host:443" -servername "$host" 2>/dev/null \
    | openssl x509 -noout -subject 2>/dev/null || echo "FAIL")
  echo "  $host → $subj"
  echo "$subj" | grep -q "$host" || { echo "❌ Wrong cert for $host"; exit 1; }
done

echo "=== Dashboard ==="
code=$(curl -s -o /dev/null -w "%{http_code}" "$WEB/")
echo "  GET $WEB → $code"
[[ "$code" == "200" ]] || exit 1

echo ""
echo "✅ Production verify passed"
echo "   Dashboard: $WEB"
echo "   API:       $API/health"
