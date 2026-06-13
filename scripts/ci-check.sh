#!/usr/bin/env bash
# Full-system quality gate — run locally before ANY commit/push, and mirrored in GitHub CI.
# Matches production build order: contracts → database → api → worker → web.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f "$ROOT/.env" ]; then
  # shellcheck disable=SC1091
  source "$ROOT/scripts/load-env.sh"
fi

export DATABASE_URL="${DATABASE_URL:-postgresql://whatsapp:whatsapp@localhost:5432/whatsapp_sender}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export JWT_SECRET="${JWT_SECRET:-ci-jwt-secret-minimum-32-characters}"
export BAILEYS_MOCK="${BAILEYS_MOCK:-1}"

step() { echo ""; echo "==> $*"; }

step "Environment"
echo "   DATABASE_URL=$DATABASE_URL"
echo "   REDIS_URL=$REDIS_URL"

if [ "${CI_CLEAN:-0}" = "1" ]; then
  step "Clean build artifacts"
  npm run clean
fi

step "Install dependencies"
if [ "${CI:-}" = "true" ] || [ "${USE_NPM_CI:-1}" = "1" ]; then
  npm ci
else
  npm install
fi

step "Prisma generate + schema push"
npm run db:generate
npx prisma db push --accept-data-loss --schema=packages/database/prisma/schema.prisma

step "Build all workspaces (contracts, database, api, worker, web)"
npm run build

step "Unit tests (api + worker, includes NestJS AppModule DI bootstrap)"
npm test

step "Lint: no duplicate UsageService in feature modules"
violations=$(grep -rn "providers:.*UsageService" apps/api/src --include '*.module.ts' \
  | grep -v 'common/common.module.ts' || true)
if [ -n "$violations" ]; then
  echo "❌ UsageService must only be provided in CommonModule (global)."
  echo "$violations"
  exit 1
fi
echo "   OK — UsageService wiring looks correct"

echo ""
echo "✅ CI check passed — safe to commit and push this feature."
