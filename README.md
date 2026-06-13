# WhatsApp Sender System

Multi-tenant WhatsApp messaging SaaS — dashboard, sessions, QR pairing, public API, campaigns, webhooks, and subscription quotas.

**Repository:** [hassangomaa/whatsapp-sender-system](https://github.com/hassangomaa/whatsapp-sender-system)

---

## Architecture

| Package / App | Role |
|---------------|------|
| `apps/web` | Next.js 14 dashboard (auth, sessions, docs, campaigns) |
| `apps/api` | NestJS REST API + JWT auth + quota middleware |
| `apps/worker` | Baileys WhatsApp client + BullMQ job processors |
| `packages/database` | Prisma schema + PostgreSQL |
| `packages/contracts` | Shared types, phone normalize, API key helpers |

```
Browser ──► web:3011 ──► api:3010 ──► PostgreSQL
                              │
                              └──► Redis ◄── worker (Baileys)
```

---

## Quick start (local)

### 1. One-time setup

```bash
cd Whatsapp-Bot
bash scripts/setup-local.sh
```

This installs Homebrew Postgres/Redis (if needed), creates the database, copies `.env`, runs migrations, and seeds plans.

### 2. Start (choose one)

**Production / real WhatsApp** (no fake QR, optimized build):

```bash
npm run prod
# or: bash scripts/prod.sh
```

**Development** (hot reload):

```bash
bash scripts/dev.sh
# or: npm run dev
```

`scripts/dev.sh` loads `.env`, builds API/worker, then starts all three services.

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3011 |
| Login | http://localhost:3011/login |
| Getting started | http://localhost:3011/getting-started |
| Sessions + QR | http://localhost:3011/sessions |
| API docs (dynamic URL) | http://localhost:3011/docs |
| API health | http://localhost:3010/health |

With `BAILEYS_MOCK=0` (default), you scan a real WhatsApp QR code. QR codes refresh every ~20 seconds (same as WhatsApp Web). Set `BAILEYS_MOCK=1` only for CI/demo (simulates connection without a scan).

### 3. First-time user flow

1. Register at `/register`
2. Create a session at `/sessions` → copy the API key
3. Open session → **Init / QR** (mock connects automatically)
4. Send a message from `/messages` or the [API docs playground](http://localhost:3011/docs)
5. Optional: `bash scripts/smoke-public-api.sh` for a full API smoke test

---

## Environment variables

Copy `.env.example` → `.env`. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | BullMQ + session queues |
| `JWT_SECRET` | Auth tokens (min 32 chars in production) |
| `CORS_ORIGIN` | Allowed dashboard origin |
| `BAILEYS_MOCK` | `1` = mock QR locally, `0` = real WhatsApp |
| `NEXT_PUBLIC_API_URL` | Shown in docs + playground |

Apps auto-load `Whatsapp-Bot/.env` even when started from workspace subfolders.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Start production servers (after `npm run build`) |
| `npm run prod` | Clean + build + start (real WhatsApp, `BAILEYS_MOCK=0`) |
| `npm run dev` | Dev mode with hot reload (via `scripts/dev.sh`) |
| `npm run clean` | Clear `.next` / `dist` caches (fixes chunk errors) |
| `npm run build` | Build all workspaces |
| `npm run test` | API + worker unit tests (incl. Nest DI bootstrap) |
| `npm run ci:check` | **Before every commit/push** — full build + test + wiring lint |
| `npm run ci:docker` | Build production Docker images (same as VPS) |
| `npm run test:e2e` | Playwright E2E (login → QR → docs) |
| `npm run verify` | Build + test + e2e + smoke |
| `npm run deploy` | Docker Compose production deploy |
| `npm run deploy:vps` | VPS update (`deploy-vps.sh code`) |
| `npm run smoke:public-api` | Register → send → webhook smoke |
| `bash scripts/setup-local.sh` | First-time local DB setup |

---

## Public API

Backward-compatible with `ttakka-apis` and `egy-guests-apis`:

```bash
curl -X POST 'http://localhost:3010/api/v1/whatsapp/public/message/send' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: sk_live_<your_session_key>' \
  -H 'Idempotency-Key: order-123' \
  -d '{"phoneNumber":"201277785111","content":"Hello"}'
```

Interactive reference: http://localhost:3011/docs (URLs update from `NEXT_PUBLIC_API_URL`).

---

## Plans & quotas

| Plan | Messages / month | Sessions |
|------|------------------|----------|
| Trial | 30 | 1 |
| Starter | 500 | 3 |
| Pro | 5,000 | 10 |

Redeem code for testing: `WELCOME100`. Enforced by `QuotaGuard` on send and session creation.

---

## Docker (alternative local / production)

```bash
# Infrastructure only (use ports 5433 / 6380 in .env)
docker compose up -d postgres redis

# Full stack (production overlay)
bash scripts/deploy.sh
```

## VPS (arheb.net)

Production on **srv851550** (`31.97.180.152`):

| URL | Role |
|-----|------|
| https://whatsapp.arheb.net | Dashboard |
| https://api.whatsapp.arheb.net | API |

```bash
# On VPS (first time)
cd /var/www
git clone https://github.com/hassangomaa/whatsapp-sender-system.git whatsapp-sender
cd whatsapp-sender
cp .env.vps.example .env && nano .env
sudo ./deploy-vps.sh full

# Updates
sudo ./deploy-vps.sh code
```

Full guide: [docs/VPS-DEPLOYMENT.md](docs/VPS-DEPLOYMENT.md) (Hostinger DNS, Nginx, Certbot).

See also [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for generic production checklist.

---

## Development & release workflow

**Goal:** VPS stays stable on first deploy — no 502 API, no DI crashes, no broken login.

### Rules (mandatory)

1. **Never commit or push before `npm run ci:check` passes locally.**
2. **Commit feature by feature** — one logical change per commit, push after each green check.
3. **Deploy to VPS only after GitHub Actions CI is green** on that commit.

Cursor agents: read [AGENTS.md](AGENTS.md) and `.cursor/skills/ship-stable/SKILL.md`.

### Local quality gate

```bash
npm run ci:check              # before every commit/push
CI_CLEAN=1 npm run ci:check    # clean .next/dist first
npm run ci:docker             # optional: verify Docker builds locally
```

Requires Postgres + Redis (local brew services, or `docker compose up -d postgres redis`).

### GitHub CI (mirrors local)

On every push/PR to `main`, [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs:

| Job | What |
|-----|------|
| **Build & test** | `scripts/ci-check.sh` — install, Prisma, full build, unit tests, Nest DI bootstrap, UsageService wiring lint |
| **Docker build** | `scripts/ci-docker.sh` — production images for api, worker, web |

### Commit → push → deploy

```bash
# 1. Implement one feature/fix
npm run ci:check
git add <files for this feature only>
git commit -m "feat(scope): description"
git push origin main

# 2. Wait for GitHub Actions ✅

# 3. On VPS
cd /var/www/whatsapp-sender
sudo bash scripts/vps/update-code.sh
```

**Never** run `npm run db:push` on the VPS host — migrations run inside Docker via `scripts/db-migrate.sh`.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Environment variable not found: DATABASE_URL` | Run `bash scripts/dev.sh` or `cp .env.example .env` |
| `Cannot find module dist/main` | Run `npm run build -w @whatsapp-sender/api` or use `npm run dev` (auto-builds) |
| Worker exits immediately | Ensure Redis is running: `brew services start redis` |
| QR disappears / “connected” without scanning | `BAILEYS_MOCK=1` was enabled — set `BAILEYS_MOCK=0`, restart worker, **Disconnect** session, then **Init / QR** again |
| `Cannot find module './391.js'` (Next.js) | Stale cache — run `npm run clean && npm run build` then restart |
| QR never connects locally | Keep page open; QR refreshes every ~20s. Check worker logs. |

---

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deploy, Docker, env |
| [docs/VPS-DEPLOYMENT.md](docs/VPS-DEPLOYMENT.md) | srv851550 + arheb.net (DNS, Nginx, SSL) |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Ops, recovery, smoke tests |
| [docs/API-PUBLIC.md](docs/API-PUBLIC.md) | Public API contract |
| [docs/UI-UX-ANALYSIS.md](docs/UI-UX-ANALYSIS.md) | Dashboard IA & UX patterns |
| [docs/FEATURE-PARITY.md](docs/FEATURE-PARITY.md) | vs whats.amratef.dev |
| [docs/PRP-GAP-ANALYSIS.md](docs/PRP-GAP-ANALYSIS.md) | Remaining gaps |

---

## Tests

```bash
npm run ci:check          # full gate — run before commit/push
npm run test              # unit tests only
CI=1 npm run test:e2e     # Playwright (auto-starts stack)
npm run verify            # ci:check + e2e + smoke (when API up)
```
