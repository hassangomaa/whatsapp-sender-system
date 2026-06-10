# VPS Deployment — srv851550 (arheb.net)

Deploy WhatsApp Sender on **srv851550** (`31.97.180.152`) with Docker Compose, Nginx, and Let's Encrypt SSL.

| URL | Purpose |
|-----|---------|
| https://whatsapp.arheb.net | Dashboard |
| https://api.whatsapp.arheb.net | REST API |

Install path: `/var/www/whatsapp-sender`

---

## 1. Hostinger DNS

In **arheb.net → DNS / Nameservers → Manage DNS records**, add:

| Type | Name | Points to | TTL |
|------|------|-----------|-----|
| A | `whatsapp` | `31.97.180.152` | 14400 |
| A | `api.whatsapp` | `31.97.180.152` | 14400 |

Do **not** remove existing records (`@`, `dashboard`, MX, TXT).

Verify propagation:

```bash
dig +short whatsapp.arheb.net
dig +short api.whatsapp.arheb.net
# both should return 31.97.180.152
```

---

## 2. One-time VPS bootstrap

SSH to the server, then either run the bootstrap script or follow the manual steps below.

### Option A — automated bootstrap

```bash
# From your machine, copy repo or clone on VPS first:
cd /var/www
git clone https://github.com/hassangomaa/whatsapp-sender-system.git whatsapp-sender
cd whatsapp-sender
sudo bash scripts/vps/bootstrap.sh
```

### Option B — manual

```bash
cd /var/www
git clone https://github.com/hassangomaa/whatsapp-sender-system.git whatsapp-sender
cd whatsapp-sender
cp .env.vps.example .env
nano .env   # set secrets (see below)
chmod +x deploy-vps.sh scripts/vps/bootstrap.sh
sudo ./deploy-vps.sh full
```

### `.env` secrets

Edit `/var/www/whatsapp-sender/.env`:

- `POSTGRES_PASSWORD` — strong password
- `DATABASE_URL` — use the **same** password: `postgresql://whatsapp:<password>@postgres:5432/whatsapp_sender`
- `JWT_SECRET` — random 64+ characters
- `WEBHOOK_SIGNING_SECRET` — random secret
- URLs should already be set for arheb.net (HTTPS)

---

## 3. Nginx reverse proxy

```bash
sudo cp nginx/whatsapp-sender.conf /etc/nginx/sites-available/whatsapp-sender
sudo ln -sf /etc/nginx/sites-available/whatsapp-sender /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Test HTTP before SSL:

```bash
curl -I http://whatsapp.arheb.net
curl http://127.0.0.1:3010/health
```

---

## 4. SSL (Certbot)

After DNS resolves and HTTP works:

```bash
sudo certbot --nginx -d whatsapp.arheb.net -d api.whatsapp.arheb.net
```

Certbot upgrades both server blocks to HTTPS automatically.

---

## 5. Verify deployment

```bash
cd /var/www/whatsapp-sender
sudo ./deploy-vps.sh status
sudo ./deploy-vps.sh test
curl https://api.whatsapp.arheb.net/health
# expect: "baileysMock":false
```

Open https://whatsapp.arheb.net → Register → Sessions → **Init / QR** → scan with WhatsApp.

---

## 6. Update workflow

After pushing changes to GitHub:

```bash
cd /var/www/whatsapp-sender
sudo ./deploy-vps.sh code
```

Or from package.json on the VPS:

```bash
npm run deploy:vps
```

---

## 7. Commands reference

| Command | Description |
|---------|-------------|
| `sudo ./deploy-vps.sh full` | First deploy: build, up, migrate, seed |
| `sudo ./deploy-vps.sh code` | `git pull` + rebuild + migrate |
| `sudo ./deploy-vps.sh test` | Smoke tests over HTTPS |
| `sudo ./deploy-vps.sh status` | Containers + health |
| `sudo ./deploy-vps.sh logs` | Tail api/worker/web logs |

---

## 8. Architecture

```
Internet → Nginx :443 → 127.0.0.1:3011 (web)
                      → 127.0.0.1:3010 (api)
Docker internal: postgres, redis, worker (Baileys sessions volume)
```

App ports **3010/3011** bind to `127.0.0.1` only — not exposed publicly. Only Nginx ports 80/443 are open.

---

## 9. Troubleshooting

| Issue | Fix |
|-------|-----|
| DNS not resolving | Wait for propagation; check Hostinger A records |
| Certbot fails | Ensure port 80 reachable; `nginx -t` passes |
| CORS errors | `CORS_ORIGIN` must match `https://whatsapp.arheb.net` exactly |
| Docs show localhost API | Rebuild web: `docker compose -f docker-compose.yml -f docker-compose.prod.yml build web && docker compose up -d web` |
| QR stream drops | Check nginx `proxy_buffering off` on API server block |
| Session lost after restart | Confirm `baileys_sessions` volume: `docker volume ls` |
| `baileysMock: true` | Set `BAILEYS_MOCK=0` in `.env`, rebuild worker |
| API healthy locally but not via HTTPS | Check nginx site enabled + certbot certs |

---

## 10. Firewall

UFW (if enabled):

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

Do **not** open 3010/3011 publicly.
