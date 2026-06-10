#!/usr/bin/env bash
# Generate secrets for .env on the VPS (does not overwrite existing .env).
# Usage: bash scripts/vps/gen-env-secrets.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${1:-$ROOT/.env}"

gen() { openssl rand -hex 32; }

if [ -f "$ENV_FILE" ] && grep -q "CHANGE_ME" "$ENV_FILE" 2>/dev/null; then
  PG_PASS="$(gen)"
  JWT="$(gen)"
  WH="$(gen)"
  sed -i.bak \
    -e "s/CHANGE_ME_STRONG_PASSWORD/$PG_PASS/g" \
    -e "s/CHANGE_ME_64_CHAR_RANDOM_SECRET/$JWT/g" \
    -e "s/CHANGE_ME_WEBHOOK_SECRET/$WH/g" \
    "$ENV_FILE"
  echo "✅ Updated secrets in $ENV_FILE (backup: ${ENV_FILE}.bak)"
  echo "   POSTGRES_PASSWORD and DATABASE_URL now use the same generated password."
else
  echo "PG_PASS=$(gen)"
  echo "JWT_SECRET=$(gen)"
  echo "WEBHOOK_SIGNING_SECRET=$(gen)"
  echo ""
  echo "Copy these into .env manually."
fi
