#!/usr/bin/env bash
# Remove build caches that cause stale Next.js chunk errors (e.g. Cannot find module './391.js').
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Cleaning build artifacts..."
rm -rf apps/web/.next
rm -rf apps/api/dist apps/api/tsconfig.tsbuildinfo
rm -rf apps/worker/dist
rm -rf packages/contracts/dist
rm -rf packages/database/dist
echo "✅ Clean complete. Run: npm run build && bash scripts/prod.sh"
