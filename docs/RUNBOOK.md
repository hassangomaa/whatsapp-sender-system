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

**Tip:** Production mounts `baileys_sessions` volume (`docker-compose.prod.yml`) so auth survives container restarts. Tune persistence via `SESSION_HEALTH_*`, `SESSION_RECONNECT_MAX_DELAY_MS`, `SESSION_RECONNECT_MAX_ATTEMPTS`, `SESSION_HOLD_COOLDOWN_MS` in `.env`.

### Permanent session SOP (hold vs logout)

Design: [PRP-STABLE-WA-SESSIONS.md](PRP-STABLE-WA-SESSIONS.md). Auth on disk is wiped **only** on a true device logout (`conflict type="device_removed"`, or `<failure reason="401">`) or an explicit user Disconnect. Everything else keeps `creds.json`:

| Close signal | Worker action |
|---|---|
| `401` + `conflict type="replaced"`, `440` | **hold** (`replaced`) — same creds opened elsewhere (old container / zombie socket) |
| `401` stream conflict, unknown type | **hold** (`conflict`) |
| `403` / `500` / transient | restore with backoff |
| 15 consecutive failed restores (`SESSION_RECONNECT_MAX_ATTEMPTS`) | **hold** (`max_attempts`) |
| `401` + `device_removed` / `401 Connection Failure` | logout — auth wiped, phone cleared, **API key kept** |

**Hold** = socket closed, DB `DISCONNECTED`, phone + auth + API key kept, Redis `session:{id}:hold` for `SESSION_HOLD_COOLDOWN_MS` (15 min). Health loop and boot restore skip held sessions; after the cooldown they retry **once** (attempt counter is not reset). Dashboard shows *"…paused. Click Init / QR to re-pair."*

**Re-pair:** clicking **Init / QR** on a held session clears the hold + stale auth (keeps phone + API key) and shows a fresh QR. Remove the stale link on the phone (Linked devices) **before** scanning.

**Success check after any deploy:** `docker compose restart worker` → session `CONNECTED` within 90s, no QR; worker logs show `action":"restore"` only, never `action":"logout"` for a healthy number.

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

### Configure OTP sender (platform admin)

1. Set `PLATFORM_ADMIN_EMAILS=your@email.com` in `.env` (comma-separated allowlist).
2. Login at `/login` with that email → open **Platform admin** at `/admin`.
3. Create a session in the platform workspace → **Init / QR** → scan with WhatsApp.
4. Select it as **OTP sender session** → Save.
5. Set **Admin alert phone** to `966508334708` (Saudi) for WhatsApp audit alerts.
6. Optional: `bash scripts/smoke-admin-platform.sh` (requires admin login credentials).

**Platform admin workspaces are unlimited** — any workspace owned by an email in `PLATFORM_ADMIN_EMAILS` (including the Platform OTP workspace) has no message or session quota. Client workspaces are limited per plan.

**WhatsApp audit alerts** (to admin phone, when enabled):

| Event | Trigger |
|-------|---------|
| New signup | OTP register completes |
| Session connected | Client session fully linked (not platform OTP session) |
| Quota exhausted | Client blocked or last message uses final quota |
| Session limit | Client cannot create more sessions |

Env vars `OTP_SESSION_ID` / `ADMIN_NOTIFY_SESSION_ID` remain as fallback until configured in the dashboard.

### QR stuck on pending

- Local: set `BAILEYS_MOCK=1`, restart worker
- Production: check worker logs, ensure outbound WhatsApp Web access

### All sessions disconnected / empty `baileys_sessions` volume

**Cause:** Two dashboard sessions were paired to the **same WhatsApp phone** at once. WhatsApp returns stream error (code **500**). Older worker builds treated 500 like logout and wiped auth.

**Fix:**

1. On the phone: WhatsApp → **Linked devices** → remove all "WhatsApp Sender" entries.
2. In the dashboard: keep **one** session (e.g. OTP Sender). Delete or never re-pair duplicate sessions (`test`, `demo`, etc.).
3. Deploy latest worker (500 → reconnect, duplicate-phone guard):

```bash
cd /var/www/whatsapp-sender
git pull origin main
sudo bash scripts/vps/update-code.sh
```

4. Scan QR on **one** session only, then verify:

```bash
sudo bash scripts/vps/recover-whatsapp-sessions.sh
```

Auth folder should contain `{sessionId}/creds.json`. Rule: **one phone = one linked session** in this system.

### Duplicate phone rejected

If a second session scans the same number, the worker disconnects the new socket and shows:
`This phone is already linked to session "…"`. Use separate phones for multiple sessions, or delete the existing linked session first.

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

## AI auto-reply (Gemini)

Worker answers inbound **1:1 text** messages with Gemini (`apps/worker/src/ai-autoreply.ts`). Groups, status, newsletters, own messages and media are never answered.

| Env | Meaning |
|---|---|
| `AI_AUTOREPLY_ENABLED=1` + `GEMINI_API_KEY` | both required to turn it on |
| `AI_AUTOREPLY_SESSION_IDS` | comma list of session ids; empty = all sessions |
| `AI_AUTOREPLY_SYSTEM_PROMPT` | persona (default: brief bilingual AR/EN business assistant) |
| `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` | `gemini-2.5-flash` → `gemini-2.5-flash-lite` on transient 429/5xx |
| `AI_AUTOREPLY_HISTORY` | prior turns from chat history sent as context (10) |
| `AI_AUTOREPLY_MAX_PER_HOUR` / `AI_AUTOREPLY_COOLDOWN_MS` | per-contact caps (30/h, 3s) |

Guards in Redis: `ai:seen:{session}:{waMessageId}` (exactly-once per message, 24h), `ai:cooldown:*`, `ai:hour:*`. Logs: `[ai-autoreply] replied …` / `rate-limited` / `gemini failed (last status N)`. Change env → `docker compose … up -d worker`.
