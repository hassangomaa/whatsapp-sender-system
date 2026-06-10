# PRP Gap Analysis — WhatsApp Sender vs whats.amratef.dev

**Date:** 2026-06-09  
**Reference:** [whats.amratef.dev](https://whats.amratef.dev/)  
**Target:** `whatsapp-sender-system` (multi-tenant SaaS)

## Executive summary

| Category | Parity | Notes |
|----------|--------|-------|
| Auth & workspaces | ✅ 100% | Register, login, JWT, workspace isolation |
| Sessions & QR | ✅ 100% | CRUD, init, disconnect, SSE QR stream |
| Public API | ✅ 100% | `message/send`, `media/send`, idempotency, x-api-key |
| Dashboard & funnel | ✅ 100% | Activation funnel, stats cards |
| Status center | ✅ 100% | Session health, quota alerts |
| Messages history | ✅ 100% | List + dashboard send |
| Packages & trial | ✅ 100% | Plans, activate, redeem, referral |
| Bulk campaigns | ✅ 100% | CSV, queue, progress |
| Webhooks | ✅ 100% | Outbound delivery + signing |
| Multi-tenant limits | ✅ 100% | Quota middleware, session limits per plan |
| Worker reliability | ✅ 100% | Health loop, rate limit, graceful shutdown |
| UI polish | ✅ 100% | Responsive, docs page, copy buttons |
| Billing (Stripe) | ⏳ Future | Manual activate; Stripe hook-ready schema |
| Real Baileys prod | ⏳ Deploy | `BAILEYS_MOCK=1` for local/CI |

## Feature matrix

### Core (Amr reference)

| Feature | Amr | Our system | Status |
|---------|-----|------------|--------|
| Email/password auth | Yes | Yes | ✅ |
| Multi-session per account | Yes | Yes + plan limits | ✅ |
| QR scan login | Yes | Yes (Baileys + SSE) | ✅ |
| Session disconnect | Yes | Yes | ✅ |
| API key per session | Yes | Yes (shown once) | ✅ |
| Public send API | Yes | Yes (contract-compatible) | ✅ |
| Idempotency-Key | Yes | Yes | ✅ |
| Media send | Yes | Yes | ✅ |
| Message history | Yes | Yes | ✅ |
| Trial quota (30) | Yes | Yes | ✅ |
| Package upgrade | Yes | Yes (manual activate) | ✅ |
| Redeem codes | Yes | Yes | ✅ |
| Referral codes | Yes | Yes | ✅ |
| Bulk send | Yes | Yes (campaigns) | ✅ |
| Webhook callbacks | Yes | Yes | ✅ |
| Dark mode | Yes | Yes | ✅ |
| Status dashboard | Yes | Yes | ✅ |
| API documentation | Yes | Yes (`/docs` + per-session) | ✅ |

### Multi-tenant scalability (beyond Amr)

| Feature | Status | Implementation |
|---------|--------|----------------|
| Workspace isolation | ✅ | All queries scoped by `workspaceId` |
| Plan-based message limits | ✅ | `UsageService` + subscription sync |
| Plan-based session limits | ✅ | `maxSessions` on `Plan` model |
| Quota guard middleware | ✅ | `QuotaGuard` on send/create routes |
| Per-session send rate limit | ✅ | Worker delay 2–5s configurable |
| Session health ping (30s) | ✅ | Worker `healthLoop` |
| Idempotency store | ✅ | `idempotency_records` table |
| Stripe-ready subscriptions | ⏳ | `Subscription` model; webhook TBD |

### Consumer API contract (ttakka / egy-guests)

Must preserve:

```json
POST /api/v1/whatsapp/public/message/send
Headers: x-api-key, Idempotency-Key
Body: { "phoneNumber": "201277785111", "content": "..." }
Response: { "id": "..." } or { "messageId": "..." }
```

Contract tests: `apps/api/src/public-api/public-api.contract.spec.ts`

## Gaps closed in this release

1. **QuotaGuard** — global NestJS guard for message send and session creation
2. **Plan.maxSessions** — trial=1, starter=3, pro=10
3. **Worker health loop** — 30s ping, mark stale sessions disconnected
4. **Send rate limiter** — per-session minimum interval (default 3s)
5. **UI** — responsive mobile nav, auth split layout, docs page, copy-to-clipboard
6. **Local setup** — `scripts/setup-local.sh` (Homebrew postgres/redis)
7. **Tests** — usage service unit tests + contract tests
8. **GitHub** — `hassangomaa/whatsapp-sender-system`

## Future roadmap

- Stripe Checkout + webhook for subscription lifecycle
- Team members / RBAC beyond owner
- Session logout (WhatsApp device unlink) distinct from disconnect
- Media base64 upload in dashboard
- Load testing (k6) for public API
- VPS deploy with real Baileys (no mock)

## Verification checklist

```bash
cd Whatsapp-Bot
bash scripts/setup-local.sh
BAILEYS_MOCK=1 npm run dev
# Dashboard http://localhost:3011
npm run test
bash scripts/smoke-public-api.sh
```
