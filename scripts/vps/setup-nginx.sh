#!/usr/bin/env bash
# Enable whatsapp-sender nginx + Let's Encrypt SSL for both subdomains.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NGINX_SITE="whatsapp-sender"
TARGET="/etc/nginx/sites-available/$NGINX_SITE"
CERT_DIR="/etc/letsencrypt/live/whatsapp.arheb.net"
DOMAINS=(whatsapp.arheb.net api.whatsapp.arheb.net)
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@arheb.net}"

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Run as root"
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "⚠️  nginx not installed — skip"
  exit 0
fi

ln -sf "$TARGET" "/etc/nginx/sites-enabled/$NGINX_SITE"

ensure_cert() {
  if [ -f "$CERT_DIR/fullchain.pem" ]; then
    if openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -text 2>/dev/null | grep -q "api.whatsapp.arheb.net"; then
      echo "✅ Certificate covers both subdomains"
      return 0
    fi
    echo "==> Expanding certificate to include api.whatsapp.arheb.net..."
    certbot certonly --nginx \
      -d "${DOMAINS[0]}" -d "${DOMAINS[1]}" \
      --non-interactive --agree-tos -m "$CERTBOT_EMAIL" \
      --expand --cert-name whatsapp.arheb.net || true
    return 0
  fi

  echo "==> Obtaining new certificate..."
  cp "$ROOT/nginx/whatsapp-sender.conf" "$TARGET"
  nginx -t
  systemctl reload nginx
  certbot certonly --nginx \
    -d "${DOMAINS[0]}" -d "${DOMAINS[1]}" \
    --non-interactive --agree-tos -m "$CERTBOT_EMAIL" \
    --cert-name whatsapp.arheb.net
}

install_ssl_config() {
  if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "❌ Certificate missing at $CERT_DIR"
    exit 1
  fi
  cp "$ROOT/nginx/whatsapp-sender.ssl.conf" "$TARGET"
  nginx -t
  systemctl reload nginx
  echo "✅ SSL nginx config installed"
}

ensure_cert
install_ssl_config

# Verify each host presents correct cert (retry — nginx reload can lag briefly)
sleep 2
for host in "${DOMAINS[@]}"; do
  subj="fail"
  for _ in 1 2 3 4 5; do
    subj=$(echo | openssl s_client -connect "$host:443" -servername "$host" 2>/dev/null \
      | openssl x509 -noout -subject 2>/dev/null || echo "fail")
    echo "$subj" | grep -q "whatsapp.arheb.net" && break
    sleep 1
  done
  if echo "$subj" | grep -q "whatsapp.arheb.net"; then
    echo "✅ SSL OK: $host ($subj)"
  else
    echo "⚠️  SSL check failed for $host ($subj) — run: curl -I https://$host"
  fi
done
