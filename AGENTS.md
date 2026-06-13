# Agent instructions (WhatsApp Sender)

Cursor agents working in this repo **must** follow the project skill:

**`.cursor/skills/ship-stable/SKILL.md`** — read it before committing, pushing, or deploying.

## Non-negotiable workflow

1. Run `npm run ci:check` locally and wait for it to pass.
2. **Never commit or push before that passes.**
3. Commit **one feature at a time**, then push.
4. Deploy to VPS only after **GitHub Actions CI is green** on that commit.

## Quality gates

| Gate | Command | Where |
|------|---------|-------|
| Local pre-commit | `npm run ci:check` | Developer machine |
| GitHub CI | `.github/workflows/ci.yml` | Every push/PR to `main` |
| VPS post-deploy | `scripts/vps/update-code.sh` | Production server |

## Production deploy (VPS)

```bash
cd /var/www/whatsapp-sender
sudo bash scripts/vps/update-code.sh
```

Do **not** run `npm run db:push` on the VPS host without Docker.
