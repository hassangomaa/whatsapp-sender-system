---
name: ship-stable
description: >-
  WhatsApp Sender release workflow — full local build/test before commit, feature-by-feature
  commits, GitHub CI green before VPS deploy. Use when implementing features, fixing bugs,
  committing, pushing, deploying to VPS, or when the user asks for stable production deploys.
---

# Ship stable (WhatsApp Sender)

Prevent production surprises (502 API, DI crashes, wrong API URL, failed migrations).

## Golden rules

1. **Never commit locally or push before test/build locally.**
2. **Commit feature by feature** — one logical change per commit, not a batch of unrelated work.
3. **Push only after local `npm run ci:check` passes.**
4. **VPS deploy only after GitHub CI is green** on the pushed commit.
5. **Never run `npm run db:push` on the VPS host** — use `bash scripts/db-migrate.sh` (Docker).

## Before every commit

From repo root:

```bash
npm run ci:check
```

Optional clean rebuild (clears Next/dist caches):

```bash
CI_CLEAN=1 npm run ci:check
```

Requires Postgres + Redis reachable at `DATABASE_URL` / `REDIS_URL` (local brew, or `docker compose up -d postgres redis` with ports in `.env`).

**If `ci:check` fails — fix first. Do not commit.**

## Commit workflow (feature by feature)

```text
1. Implement ONE feature or fix
2. npm run ci:check          ← must pass
3. git add <only that feature's files>
4. git commit -m "feat(scope): …"   or fix/docs/test
5. git push origin main
6. Wait for GitHub Actions CI ✅
7. Only then: VPS deploy (if needed)
```

Example sequence for a multi-part task:

```text
feat(api): add OTP service          → ci:check → commit → push → CI green
feat(web): phone login UI           → ci:check → commit → push → CI green
fix(deploy): migrate before api     → ci:check → commit → push → CI green
```

## What `ci:check` runs

Mirrors `.github/workflows/ci.yml` job **Build & test**:

| Step | Catches |
|------|---------|
| `npm ci` + `db:generate` + `db:push` | Prisma / schema errors |
| `npm run build` | TypeScript, Next.js, Nest compile failures |
| `npm test` | Unit tests + **AppModule DI bootstrap** (Nest wiring) |
| UsageService lint | Duplicate providers that crash API at startup |

Docker images are built in CI job **Docker build** (`npm run ci:docker`).

## Before VPS deploy

```bash
# On laptop — already pushed and CI green
# On VPS:
cd /var/www/whatsapp-sender
sudo bash scripts/vps/update-code.sh
```

Never skip: migrate runs **before** API starts. Auth smoke runs at end.

## Agent checklist

When finishing a task:

- [ ] Run `npm run ci:check` (actually run it, do not skip)
- [ ] Split into feature-sized commits if multiple concerns changed
- [ ] Push after each green local check
- [ ] Tell user to deploy only after CI green
- [ ] Do not attribute tooling in commits or docs

## Quick commands

| Command | When |
|---------|------|
| `npm run ci:check` | Before every commit/push |
| `CI_CLEAN=1 npm run ci:check` | Stale Next.js chunk / dist issues |
| `npm run ci:docker` | Verify Dockerfiles locally |
| `npm run verify` | Full local verify (+ e2e if stack up) |
| `sudo bash scripts/vps/update-code.sh` | Production update on VPS |

See [README.md](../../README.md#development--release-workflow) and [docs/RUNBOOK.md](../../docs/RUNBOOK.md).
