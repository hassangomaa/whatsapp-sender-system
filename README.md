# WhatsApp Sender System

Multi-tenant WhatsApp messaging SaaS — greenfield rebuild matching [whats.amratef.dev](https://whats.amratef.dev/).

**Repository:** [hassangomaa/whatsapp-sender-system](https://github.com/hassangomaa/whatsapp-sender-system)

## Stack

| App | Tech |
|-----|------|
| `apps/web` | Next.js 14 dashboard (responsive, dark mode) |
| `apps/api` | NestJS REST API + quota middleware |
| `apps/worker` | Baileys + BullMQ (health loop, rate limits) |
| `packages/database` | Prisma + PostgreSQL |
| `packages/contracts` | Shared types, phone normalize, API keys |

## Quick start (local — Homebrew)

```bash
cd whatsapp-sender-system
bash scripts/setup-local.sh

# Or manually:
cp .env.example .env
brew services start postgresql@16 redis
npm install && npm run db:push && npm run db:generate
npm run seed -w @whatsapp-sender/database

BAILEYS_MOCK=1 npm run dev
```

- Dashboard: http://localhost:3011
- API: http://localhost:3010
- Health: http://localhost:3010/health

## Docker alternative

```bash
docker compose up -d postgres redis
# Use ports 5433 / 6380 in .env
```

## Public API (backward compatible)

```bash
curl -X POST 'http://localhost:3010/api/v1/whatsapp/public/message/send' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: sk_live_...' \
  -H 'Idempotency-Key: test-001' \
  -d '{"phoneNumber":"201277785111","content":"Hello"}'
```

Used by `ttakka-apis` and `egy-guests-apis` — contract tests in `apps/api/src/public-api/`.

## Multi-tenant packages

| Plan | Messages | Sessions |
|------|----------|----------|
| Trial | 30 | 1 |
| Starter | 500 | 3 |
| Pro | 5000 | 10 |

Quota enforced via `QuotaGuard` middleware. Redeem code: `WELCOME100`.

## Tests

```bash
npm run test
npm run test:contract
bash scripts/smoke-public-api.sh   # requires running API
```

## Docs

- [docs/PRP-GAP-ANALYSIS.md](docs/PRP-GAP-ANALYSIS.md)
- [docs/API-PUBLIC.md](docs/API-PUBLIC.md)
- [docs/FEATURE-PARITY.md](docs/FEATURE-PARITY.md)
- [docs/RUNBOOK.md](docs/RUNBOOK.md)

## QR login flow

1. Register / login at `/login`
2. Create session at `/sessions`
3. Open session → **Init / QR**
4. Scan QR (or wait 3s in `BAILEYS_MOCK=1`)
5. Send from `/messages` or public API
