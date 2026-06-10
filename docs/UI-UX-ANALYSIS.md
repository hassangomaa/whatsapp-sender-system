# UI/UX System Analysis — WhatsApp Sender

**Last updated:** 2026-06-10

## Information architecture

| Section | Pages | Purpose |
|---------|-------|---------|
| Overview | Dashboard, Getting started, Status | Onboarding & health |
| WhatsApp | Sessions, Messages, Campaigns, Webhooks | Core product |
| Account | Packages, API docs, Settings | Billing & config |

Navigation is grouped in [`apps/web/src/lib/nav.ts`](../apps/web/src/lib/nav.ts) and shared across desktop sidebar + mobile menu.

## User flows

### Primary: Login → Session → QR → API

1. **Landing** `/` — marketing + CTA (redirects if authenticated)
2. **Register/Login** — split auth layout with trial messaging
3. **Getting started** `/getting-started` — progress tracker + live API URL
4. **Sessions** — create, copy API key, open detail
5. **Session detail** — Init/QR (SSE stream), scopes, disconnect confirm
6. **Docs** — dynamic curl examples + API playground
7. **Messages / Public API** — send first message

### Secondary flows

- **Packages** — quota bars, plan activate with confirm, redeem codes
- **Webhooks** — test, delivery log, retry failed
- **Campaigns** — bulk create, start with confirm, progress polling

## UX patterns (consistent)

| Pattern | Implementation |
|---------|----------------|
| Loading | `LoadingState` spinner |
| Empty data | `EmptyState` with CTA |
| Success/error | `ToastProvider` |
| Destructive actions | `ConfirmDialog` |
| Mobile tables | `.table-responsive` wrapper |
| Page titles | `PageHeader` |
| Live API URL | `getApiUrl()` + `ApiStatusBanner` |

## Dynamic documentation

- Base URL from `NEXT_PUBLIC_API_URL` or `hostname:3010`
- Health check badge on docs & getting started
- Curl examples re-render when URL changes
- API playground calls live endpoint (CORS enabled on API)

## Test coverage map

| Layer | Tests |
|-------|-------|
| Contracts | Phone normalize, response shapes |
| Usage | Quota + session limits |
| Dashboard | Extended stats |
| Webhooks | List, retry |
| Settings | Get/update |
| Quota guard | send + create_session |
| Sessions | List, create, init, disconnect, not-found |
| E2E (Playwright) | Dashboard nav + full login→QR→docs flow |
| Smoke | `bash scripts/smoke-public-api.sh` (API must be running) |

## Remaining enhancements (future)

- Stripe checkout UI
- Team invite / RBAC
- Real-time message status via SSE
- i18n (Arabic/English)
- Icon set (Lucide) instead of unicode glyphs

## Local test URLs

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3011 |
| Login | http://localhost:3011/login |
| Getting started | http://localhost:3011/getting-started |
| API health | http://localhost:3010/health |
| API docs (in-app) | http://localhost:3011/docs |
