#!/usr/bin/env bash
# One-time VPS bootstrap for srv851550 (Ubuntu 22.04).
# Run as root: sudo bash scripts/vps/bootstrap.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/hassangomaa/whatsapp-sender-system.git}"
APP_DIR="${APP_DIR:-/var/www/whatsapp-sender}"
NGINX_SITE="whatsapp-sender"

echo "==> WhatsApp Sender VPS bootstrap"
echo "    App dir: $APP_DIR"

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Run as root: sudo bash scripts/vps/bootstrap.sh"
  exit 1
fi

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "✅ Docker already installed"
    return
  fi
  echo "==> Installing Docker..."
  apt-get update -qq
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  echo "✅ Docker installed"
}

configure_firewall() {
  if command -v ufw >/dev/null 2>&1; then
    echo "==> Configuring UFW (22, 80, 443)..."
    ufw allow 22/tcp || true
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    echo "   App ports 3010/3011 stay on 127.0.0.1 only (Nginx terminates TLS)."
  else
    echo "⚠️  ufw not found — ensure Hostinger firewall allows 80/443."
  fi
}

clone_repo() {
  mkdir -p /var/www
  if [ -d "$APP_DIR/.git" ]; then
    echo "✅ Repo already cloned at $APP_DIR"
    cd "$APP_DIR"
    git pull --ff-only || true
  else
    echo "==> Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
  fi
}

setup_env() {
  if [ ! -f .env ]; then
    cp .env.vps.example .env
    echo "⚠️  Created .env from .env.vps.example — edit secrets before deploy:"
    echo "    nano $APP_DIR/.env"
    echo "    Set POSTGRES_PASSWORD, JWT_SECRET, WEBHOOK_SIGNING_SECRET"
    echo "    Use the same password in DATABASE_URL and POSTGRES_PASSWORD"
  else
    echo "✅ .env already exists"
  fi
}

install_nginx_site() {
  if ! command -v nginx >/dev/null 2>&1; then
    echo "⚠️  nginx not installed — install manually, then copy nginx/whatsapp-sender.conf"
    return
  fi
  if [ -f "$APP_DIR/nginx/whatsapp-sender.conf" ]; then
    cp "$APP_DIR/nginx/whatsapp-sender.conf" "/etc/nginx/sites-available/$NGINX_SITE"
    ln -sf "/etc/nginx/sites-available/$NGINX_SITE" "/etc/nginx/sites-enabled/$NGINX_SITE"
    if nginx -t 2>/dev/null; then
      systemctl reload nginx
      echo "✅ Nginx site enabled: $NGINX_SITE"
    else
      echo "⚠️  Nginx config test failed — another site may be broken (e.g. altmiz)."
      echo "    whatsapp-sender config copied to sites-available/$NGINX_SITE"
      echo "    Fix nginx first: sudo nginx -t"
      echo "    Then: sudo systemctl reload nginx"
    fi
  fi
}

print_certbot_hint() {
  cat <<EOF

==> Next steps (after DNS propagates):

1. Hostinger DNS — add A records for arheb.net:
   whatsapp      → 31.97.180.152
   api.whatsapp  → 31.97.180.152

2. Verify DNS:
   dig +short whatsapp.arheb.net
   dig +short api.whatsapp.arheb.net

3. Edit secrets:
   nano $APP_DIR/.env

4. Deploy:
   cd $APP_DIR && chmod +x deploy-vps.sh && sudo ./deploy-vps.sh full

5. SSL (after HTTP works):
   sudo certbot --nginx -d whatsapp.arheb.net -d api.whatsapp.arheb.net

6. Verify:
   sudo ./deploy-vps.sh test

EOF
}

install_docker
configure_firewall
clone_repo
setup_env
chmod +x "$APP_DIR/deploy-vps.sh" 2>/dev/null || true
install_nginx_site
print_certbot_hint

if [ -f "$APP_DIR/.env" ] && grep -q "CHANGE_ME" "$APP_DIR/.env" 2>/dev/null; then
  echo "⚠️  .env still has CHANGE_ME placeholders — edit before running deploy-vps.sh full"
else
  echo "==> Running first deploy..."
  cd "$APP_DIR"
  ./deploy-vps.sh full
fi
