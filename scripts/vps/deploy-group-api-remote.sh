#!/usr/bin/env bash
# Deploy group/channel API to production WhatsApp Sender VPS, then discover JIDs.
# Run ON the VPS as root:
#   cd /var/www/whatsapp-sender && sudo bash scripts/vps/deploy-group-api-remote.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "==> Pull latest Whatsapp-Bot"
git fetch origin
git checkout main
git pull origin main

echo "==> Deploy code (rebuild api + worker)"
sudo ./deploy-vps.sh code

echo "==> Health"
curl -sf https://api.whatsapp.arheb.net/health | python3 -m json.tool

echo "==> Done — from zaedl-store run:"
echo "    php artisan whatsapp:smoke-test --setup"
echo "    php artisan whatsapp:smoke-test --send"
