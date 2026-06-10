#!/usr/bin/env bash
# One-command VPS bootstrap — clone, env, docker, deploy, nginx, SSL.
# Run as root: sudo bash scripts/vps/bootstrap.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/hassangomaa/whatsapp-sender-system.git}"
APP_DIR="${APP_DIR:-/var/www/whatsapp-sender}"

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Run as root: sudo bash scripts/vps/bootstrap.sh"
  exit 1
fi

mkdir -p /var/www
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull --ff-only
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

chmod +x deploy-vps.sh scripts/vps/*.sh scripts/*.sh 2>/dev/null || true
./deploy-vps.sh full
