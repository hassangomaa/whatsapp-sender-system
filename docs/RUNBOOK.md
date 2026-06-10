# Runbook

## Local development

```bash
docker compose up -d postgres redis
cp .env.example .env
npm install
DATABASE_URL=postgresql://whatsapp:whatsapp@localhost:5433/whatsapp_sender npm run db:push
npm run db:generate
DATABASE_URL=postgresql://whatsapp:whatsapp@localhost:5433/whatsapp_sender npm run seed -w @whatsapp-sender/database
BAILEYS_MOCK=1 npm run dev
```

## Production deploy (Docker)

```bash
docker compose up -d --build
docker compose exec api npm run db:push -w @whatsapp-sender/database
docker compose exec api npm run seed -w @whatsapp-sender/database
```

Set `JWT_SECRET`, `WEBHOOK_SIGNING_SECRET`, and strong Postgres credentials in production.

## Session recovery

1. Worker restarts → `restoreConnectedSessions()` reloads Baileys from `sessions/` auth files
2. If disconnected → user clicks **Init / QR** on session detail page
3. For logged-out sessions → scan QR again

## Smoke test

```bash
bash scripts/smoke-public-api.sh
```

## Point consumers to new host

Update in `ttakka-apis` / `egy-guests-apis`:

```
WHATSAPP_SENDER_BASE_URL=https://your-whatsapp-sender.example.com
WHATSAPP_SENDER_API_KEY=sk_live_...
```
