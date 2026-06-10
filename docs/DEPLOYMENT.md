# Deployment Guide

Deploy the WhatsApp Sender stack to a VPS, cloud VM, or local Docker host.

**Production VPS (arheb.net):** see [VPS-DEPLOYMENT.md](./VPS-DEPLOYMENT.md) for the full srv851550 runbook (Hostinger DNS, Nginx, Certbot, `deploy-vps.sh`).

---

## Prerequisites

- Docker 24+ and Docker Compose v2
- Domain (optional) with DNS A record → server IP
- TLS termination (Caddy, Nginx, or cloud load balancer)

---

## 1. Clone & configure

```bash
git clone https://github.com/hassangomaa/whatsapp-sender-system.git
cd whatsapp-sender-system
cp .env.example .env
```

Edit `.env` for production:

```env
# Use Docker internal hostnames when running full compose stack
DATABASE_URL=postgresql://whatsapp:STRONG_PASSWORD@postgres:5432/whatsapp_sender
REDIS_URL=redis://redis:6379

JWT_SECRET=<random-64-char-secret>
WEBHOOK_SIGNING_SECRET=<random-secret>

# Public URLs (used in docs UI + CORS)
CORS_ORIGIN=https://whats.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.whats.yourdomain.com
NEXT_PUBLIC_WEB_URL=https://whats.yourdomain.com

# Real WhatsApp pairing in production
BAILEYS_MOCK=0
```

> **Important:** `NEXT_PUBLIC_API_URL` is embedded at **web build time**. Rebuild the `web` image after changing it.

---

## 2. Deploy with script

```bash
bash scripts/deploy.sh
```

Uses `docker-compose.yml` + `docker-compose.prod.yml` (localhost-bound ports, internal DB/Redis, session volume).

This will:

1. Build Docker images (`api`, `worker`, `web`)
2. Start Postgres + Redis with health checks
3. Start application services
4. Run `db:push` and seed plans
5. Poll `/health` until API is ready

### arheb.net production example

```env
CORS_ORIGIN=https://whatsapp.arheb.net
NEXT_PUBLIC_API_URL=https://api.whatsapp.arheb.net
NEXT_PUBLIC_WEB_URL=https://whatsapp.arheb.net
```

On the VPS use `deploy-vps.sh` instead:

```bash
cp .env.vps.example .env && nano .env
sudo ./deploy-vps.sh full    # first deploy
sudo ./deploy-vps.sh code    # updates
```

---

## 3. Manual Docker Compose

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api worker web

docker compose exec api sh -c "cd /app && npm run db:push -w @whatsapp-sender/database"
docker compose exec api sh -c "cd /app && npm run seed -w @whatsapp-sender/database"
```

### Ports

| Service | Dev (`docker-compose.yml`) | Prod overlay |
|---------|---------------------------|--------------|
| Web | 3011 | 127.0.0.1:3011 |
| API | 3010 | 127.0.0.1:3010 |
| Postgres | 5433 | internal only |
| Redis | 6380 | internal only |

---

## 4. Reverse proxy (recommended)

Ready-made config: [`nginx/whatsapp-sender.conf`](../nginx/whatsapp-sender.conf) (arheb.net). Example Nginx snippets:

```nginx
# Dashboard
server {
  listen 443 ssl;
  server_name whats.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3011;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
  }
}

# API
server {
  listen 443 ssl;
  server_name api.whats.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3010;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    # SSE for QR stream
    proxy_buffering off;
    proxy_read_timeout 3600s;
  }
}
```

Update `.env`:

```env
CORS_ORIGIN=https://whats.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.whats.yourdomain.com
```

Rebuild web: `docker compose build web && docker compose up -d web`

---

## 5. VPS checklist

- [ ] Strong `JWT_SECRET` and Postgres password
- [ ] `BAILEYS_MOCK=0` for real WhatsApp
- [ ] Firewall: expose 443 only (not 3010/3011 publicly if proxied)
- [ ] Persistent volume for Postgres (`pgdata` in compose)
- [ ] Persistent volume for Baileys auth files (`apps/worker/sessions/` — mount in worker container for session recovery)
- [ ] Set up log rotation: `docker compose logs -f`
- [ ] Health monitor on `GET /health`

---

## 6. Homebrew local (no Docker)

```bash
bash scripts/setup-local.sh
bash scripts/dev.sh
```

Uses Postgres `5432` and Redis `6379` (not Docker ports).

---

## 7. Post-deploy verification

```bash
curl https://api.whats.yourdomain.com/health
API_URL=https://api.whats.yourdomain.com bash scripts/smoke-public-api.sh
```

Or from the server with local ports:

```bash
npm run verify
```

---

## 8. Updating

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api sh -c \
  "cd /app && npm run db:push -w @whatsapp-sender/database"
```

On srv851550: `sudo ./deploy-vps.sh code`

---

## 9. Consumer integration

Point downstream services (`ttakka-apis`, `egy-guests-apis`) to:

```env
WHATSAPP_SENDER_BASE_URL=https://api.whats.yourdomain.com
WHATSAPP_SENDER_API_KEY=sk_live_<session_key>
```

See [API-PUBLIC.md](./API-PUBLIC.md) for request/response contract.
