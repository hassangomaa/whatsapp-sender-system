#!/usr/bin/env bash
# Run build + unit tests + smoke (if API is up).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/load-env.sh"

echo "==> Build"
npm run build

echo "==> Unit tests"
npm run test

echo "==> E2E (auto-starts dev stack)"
CI=1 npm run test:e2e

if curl -sf "${NEXT_PUBLIC_API_URL}/health" >/dev/null 2>&1; then
  echo "==> Smoke test"
  bash scripts/smoke-public-api.sh
else
  echo "⚠️  API not running — skip smoke test (start with: bash scripts/dev.sh)"
fi

echo "✅ All verification passed."
