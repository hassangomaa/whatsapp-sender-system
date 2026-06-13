# Runbook

Day-2 operations for WhatsApp Sender.

---

## Start / stop

### Local development

```bash
bash scripts/dev.sh        # recommended — loads .env, builds, starts all
# Ctrl+C to stop
```

### Docker production

```bash
docker compose up -d
docker compose down
docker compose logs -f api worker web
```

---

## Health checks

| Endpoint | Expected |
|----------|----------|
| `GET /health` | `{"status":"ok","service":"whatsapp-sender-api"}` |
| Dashboard `/status` | Session + quota summary (auth required) |

```bash
curl -s http://localhost:3010/health | jq .
```

---

## Smoke test

Requires API + worker running with `BAILEYS_MOCK=1`:

```bash
bash scripts/smoke-public-api.sh
# or with custom host:
API_URL=https://api.example.com bash scripts/smoke-public-api.sh
```

Flow: register → create session → init (mock connect) → public send → webhook test → list deliveries.

---

## Session recovery

1. Worker restart → `restorePersistedSessions()` reloads all paired sessions from auth files on disk (including rows falsely marked `DISCONNECTED` when auth + phone remain).
2. Transient network drop → Baileys auto-reconnects with exponential backoff; dashboard shows **reconnecting** then **connected**.
3. Health loop (every 30s) triggers reconnect when auth files exist but the in-memory socket is missing — it no longer marks sessions disconnected just because the worker was briefly down.
4. User-initiated disconnect or phone “Log out linked device” → scan QR again (`BAILEYS_MOCK=0` only).

**Tip:** Production mounts `baileys_sessions` volume (`docker-compose.prod.yml`) so auth survives container restarts. Tune persistence via `SESSION_HEALTH_*` and `SESSION_RECONNECT_MAX_DELAY_MS` in `.env`.

After upgrading, apply schema changes **inside Docker** (do not run `npm run db:push` on the VPS host — Prisma is not installed there):

```bash
bash scripts/db-migrate.sh
# or: sudo ./deploy-vps.sh migrate
# or full update: sudo bash scripts/vps/update-code.sh
```

**Live connection health:** Worker writes Redis keys `session:{id}:live` (120s TTL). Dashboard and status APIs expose `liveConnected` / `liveConnectedSessions` based on actual Baileys sockets, not DB status alone.

**Browser refresh / tab close:** Does not terminate WhatsApp — only the dashboard SSE stream. The session detail page auto-reconnects SSE and polls status every 30s while connected.

---

## Common incidents

### Worker: `DATABASE_URL` not found

**Cause:** Started `npm run dev:raw` without loading `.env`.

**Fix:**

```bash
bash scripts/dev.sh
# or: cp .env.example .env
```

### API: `Cannot find module dist/main`

**Cause:** `nest start --watch` ran before first build.

**Fix:**

```bash
npm run build -w @whatsapp-sender/api
bash scripts/dev.sh
```

### Login shows "Failed to fetch"

**Cause:** Dashboard JavaScript calling wrong API URL (often `localhost:3010` baked into an old web build), API down, or CORS mismatch.

**Fix:**

```bash
cd /var/www/whatsapp-sender
sudo bash scripts/vps/update-code.sh
# or: sudo ./deploy-vps.sh code
npm run smoke:auth
```

Ensure `.env` has `CORS_ORIGIN=https://whatsapp.arheb.net` and `NEXT_PUBLIC_API_URL=https://api.whatsapp.arheb.net`. The web app also auto-derives `api.{hostname}` at runtime in production.

### QR stuck on pending

- Local: set `BAILEYS_MOCK=1`, restart worker
- Production: check worker logs, ensure outbound WhatsApp Web access

### Public API 403 quota exceeded

- Check `/packages` for plan limits
- Redeem `WELCOME100` or activate a higher plan

### Webhook deliveries failing

- Verify `webhookUrl` on session scopes
- Check `/webhooks` for delivery log + retry
- Test with `POST /api/v1/webhooks/test`

---

## Database

**Local dev:**

```bash
npm run db:push
npm run db:generate
npm run seed -w @whatsapp-sender/database
```

**Production (VPS) — always via Docker:**

```bash
bash scripts/db-migrate.sh
```

---

## Full verification pipeline

```bash
npm run verify
```

Runs: build → unit tests → E2E → smoke (if API is up).

---

## Point consumers to new host

Update in `ttakka-apis` / `egy-guests-apis`:

```env
WHATSAPP_SENDER_BASE_URL=https://api.yourdomain.com
WHATSAPP_SENDER_API_KEY=sk_live_...
```
