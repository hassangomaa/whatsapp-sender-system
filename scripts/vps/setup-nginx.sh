#!/usr/bin/env bash
# Enable whatsapp-sender nginx site + certbot SSL (non-interactive when possible).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NGINX_SITE="whatsapp-sender"
DOMAINS=(whatsapp.arheb.net api.whatsapp.arheb.net)

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Run as root"
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "⚠️  nginx not installed — skip"
  exit 0
fi

cp "$ROOT/nginx/whatsapp-sender.conf" "/etc/nginx/sites-available/$NGINX_SITE"
ln -sf "/etc/nginx/sites-available/$NGINX_SITE" "/etc/nginx/sites-enabled/$NGINX_SITE"

if ! nginx -t; then
  echo "❌ nginx -t failed — fix other sites first (altmiz/zaedl)"
  exit 1
fi
systemctl reload nginx
echo "✅ Nginx site enabled: $NGINX_SITE"

if ! command -v certbot >/dev/null 2>&1; then
  echo "⚠️  certbot not installed — HTTP only until SSL is configured"
  exit 0
fi

if certbot certificates 2>/dev/null | grep -q "whatsapp.arheb.net"; then
  echo "✅ SSL cert already exists for whatsapp.arheb.net"
  certbot renew --nginx --quiet 2>/dev/null || true
  exit 0
fi

CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@arheb.net}"
certbot --nginx \
  -d "${DOMAINS[0]}" -d "${DOMAINS[1]}" \
  --non-interactive --agree-tos \
  -m "$CERTBOT_EMAIL" \
  --redirect
echo "✅ SSL certificates installed"
