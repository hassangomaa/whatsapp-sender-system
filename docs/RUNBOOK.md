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

1. Worker restart → `restoreConnectedSessions()` reloads Baileys from auth files
2. Session disconnected → user clicks **Init / QR** on session detail
3. Logged out from phone → scan QR again (`BAILEYS_MOCK=0` only)

**Tip:** Mount `apps/worker/sessions/` persistently in Docker so auth survives container restarts.

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

```bash
# Migrate schema
npm run db:push

# Regenerate Prisma client
npm run db:generate

# Seed plans (idempotent)
npm run seed -w @whatsapp-sender/database
```

Docker:

```bash
docker compose exec api sh -c "cd /app && npm run db:push -w @whatsapp-sender/database"
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
