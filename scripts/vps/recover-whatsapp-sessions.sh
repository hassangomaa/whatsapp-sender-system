#!/usr/bin/env bash
# Recover WhatsApp sessions after duplicate-phone disconnect or wiped auth volume.
# Run on VPS as root: sudo bash scripts/vps/recover-whatsapp-sessions.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

CF="-f docker-compose.yml -f docker-compose.prod.yml"

echo "=== Health ==="
curl -sf "http://127.0.0.1:${API_HOST_PORT:-3020}/health" || echo "Local API health failed"
curl -sf "https://api.whatsapp.arheb.net/health" || echo "Public API health failed"

echo ""
echo "=== Container status ==="
docker compose $CF ps

echo ""
echo "=== Session auth files (baileys_sessions volume) ==="
docker compose $CF exec worker ls -la /app/apps/worker/sessions/ || true

echo ""
echo "=== DB sessions ==="
docker compose $CF exec -T postgres psql -U whatsapp -d whatsapp_sender -c \
  "SELECT id, name, status, phone, updated_at FROM whatsapp_sessions ORDER BY updated_at DESC;"

echo ""
echo "=== Redis live keys ==="
docker compose $CF exec redis redis-cli KEYS 'session:*:live'

echo ""
echo "=== Recent worker connection logs ==="
docker compose $CF logs --tail=80 worker | grep -E 'connected|connection closed|duplicate phone|restore|logout' || true

cat <<'EOF'

Manual recovery (required once after duplicate-phone wipe):
1. On your phone: WhatsApp → Linked devices → remove ALL "WhatsApp Sender" devices.
2. In dashboard: keep ONE session (e.g. OTP Sender). Delete or never re-pair extras.
3. Init / QR on that ONE session only — one phone = one linked session.
4. Re-run this script to confirm sessions/ has creds and status is CONNECTED.

Deploy latest fixes:
  git pull origin main
  sudo bash scripts/vps/update-code.sh
EOF
