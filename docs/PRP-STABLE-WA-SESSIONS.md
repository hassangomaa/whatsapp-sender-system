# PRP — Permanent-stable WhatsApp sessions (whatsapp.arheb.net)

Status: **approved 2026-09-21** (plan + independent review below). Implemented in the same change set.

## 1. Incident summary (live review, 2026-09-21)

`whatsapp.arheb.net` was not keeping a live WhatsApp session. Stack (api/web/worker) was up; Baileys auth was **wiped** after a conflict/`401`. Before that, the platform OTP session (`cmqbpbgcb000joc01kerawt9z`, "OTP Sender") sat in a ~**6,600**-attempt reconnect loop on `403 Connection Failure`.

| Check | Result |
|---|---|
| Public health | `ok`, `baileysMock: false`, `qrRefreshSeconds: 20` |
| Containers | api/web/worker/postgres/redis up ~2 days |
| Git on VPS | `91d8381` — 2 commits behind `origin/main` |
| DB sessions | all 5 `DISCONNECTED`, phones cleared |
| Auth volume `baileys_sessions` | mounted, folders empty — nothing to restore |
| Redis live keys | empty |

### Why it "keeps flushing" vs bots that stay linked forever

1. The QR UI refreshes every ~20s **by design** while unpaired — looks like a flush, is not.
2. Real wipe path: Baileys `401` → `resolveCloseAction` → `logout` → `clearAuthState` (disk creds deleted, phone + API keys nulled).
   - `test`: `401 Stream Errored (conflict)` → wipe.
   - OTP Sender: endless `403` restores, then `401 Connection Failure` → wipe.
3. Reconnect storm: only a **delay** cap (`SESSION_RECONNECT_MAX_DELAY_MS`, 60s), **no attempt cap**. 6,600 attempts × ≤60s ≈ days of hammering — a ban risk on the number by itself.
4. Historic multi-session on one stack (`OTP Sender`×2, `test`, `demo`, `bot`).
5. Other "forever" bots keep sessions because their `creds.json` is still accepted and they do not thrash reconnect or dual-pair the number.

## 2. Honest bound

WhatsApp can always revoke a linked device from the phone. "Never expired" here means: keep `creds.json` unless the user explicitly disconnects or WhatsApp sends a **true** device logout; never self-destroy auth via reconnect storms, `replaced` conflicts, or ambiguous `401`s.

## 3. Original plan (as submitted)

1. **Never wipe auth except true logout / user disconnect** — add `hold` action in `session-close.ts`; conflict / ambiguous 401 → hold, not wipe. Hold = Redis flag + DB `DISCONNECTED` + keep `phone`, auth, API keys.
2. **Circuit breaker** — `SESSION_RECONNECT_MAX_ATTEMPTS` (default 15); after max → hold + SSE `needs_repair`; reset counter only on `open`; health loop must not restore while held.
3. **One phone = one session** — VPS DB keeps only the platform OTP session; others disconnected/removed.
4. **Production recover once** — clear Linked devices on phone `201039772931`, deploy, login as platform admin, Init one OTP Sender, scan once, confirm `creds.json` on volume, restart worker, verify restore without QR.
5. **Prove permanence** — unit specs for hold/logout/cap; VPS smoke: kill worker, `up -d worker`, session returns without QR; RUNBOOK SOP.
6. **Status channel** — Arheb | ارحب Telegram only.

Out of scope: multi-server active-active, immunity to phone-side "Log out of all devices", migration to Cloud API.

## 4. Independent review (verified against code + Baileys 6.7.23 source)

**Verdict: GO with 3 required corrections.** Diagnosis correct; the fix as written would trade one failure mode (wipe) for another (stuck-forever hold).

Verified claims: every `401` wiped (`session-close.ts`); no attempt cap (`scheduleReconnect`); logout nulls `phone` **and `apiKeyHash/apiKeyEncrypted`** — the Arheb Laravel integration key died on every wipe (the plan missed this); health loop and boot restore both key off `phone != null && hasAuthFiles`, so any hold must gate **both**.

### Correction 1 — classify from Baileys' structured error data, not message strings

Baileys attaches the raw node as `error.data`. The two "401" shapes mean opposite things:

| Signal | Meaning | Decision |
|---|---|---|
| `Stream Errored (conflict)`, `<conflict type="device_removed">` | user removed the device on the phone — **true logout** | **logout (wipe)** |
| `Stream Errored (conflict)`, `<conflict type="replaced">` | same creds opened elsewhere (zombie socket, old container during deploy, double init) | **hold with cooldown** |
| `Connection Failure` reason `401` | server rejected creds at login — creds dead | **logout**; only reachable after the breaker, so no longer storm-triggered |
| `Connection Failure` reason `403` | forbidden | restore through the breaker → **hold with cooldown**, never a tight loop |
| `440 connectionReplaced` | Baileys' own replaced mapping | hold with cooldown |
| attempts ≥ cap | storm | hold with cooldown + loud log |

### Correction 2 — hold makes Init a dead end unless there is a Reset

`initSession` always restores when auth files exist. Under hold-only, Init → restore → same close → hold, and **no QR is ever produced**. Today the wipe is what makes Init show a QR. Required: manual Init on a held session must clear hold + auth (keep `phone` + API keys) and pair fresh.

### Correction 3 — keep API keys on hold and on logout

Nulling `apiKey*` on logout was never a deliberate product decision; it is why each incident cascaded into "the Laravel key stopped working too". Worker-side logout/hold keep the keys. Explicit user Disconnect keeps existing behaviour.

### Smaller points

- Hold TTL per reason (`replaced` / `403` / cap → cooldown); attempts **not** reset on hold, so a dead session costs one attempt per cooldown, not 15.
- Cause of `replaced` is unproven — it means the *same creds* connected twice, not two sessions on one phone. Log the conflict type; check the old worker container is stopped before the new one starts.
- 15 attempts × ≤60s ≈ 13 min of retrying — do not go lower.
- Ops order: remove Linked devices on the phone **before** the first Init.
- Success criterion must be numeric: worker restart → `CONNECTED` within 90s; zero `logout` actions in worker logs over 7 days.

## 5. Implemented design

- `session-close.ts`: `resolveCloseAction({ code, message, conflictType, hasAuth })` returns `restart_pairing | logout | restore | hold(reason) | disconnected | disconnected_retry`. `extractConflictType(err)` reads `err.data.content[0].attrs.type`.
- `session-manager.ts`:
  - `scheduleReconnect` enforces `SESSION_RECONNECT_MAX_ATTEMPTS` (default 15) → `enterHold('max_attempts')`.
  - `enterHold` — end socket, clear live, set `session:{id}:hold` (TTL `SESSION_HOLD_COOLDOWN_MS`, default 15 min), DB `DISCONNECTED` + `qrCode:null`, **keep** phone/auth/API keys, publish SSE `error` "Click Init / QR to re-pair".
  - `initSession(restore)` on a held session → skip. Manual Init on a held session → clear hold + auth, reset attempts, fresh QR.
  - Worker-side `logout` no longer nulls API keys.
- `health-loop.ts`: skips held sessions.
- Env: `SESSION_RECONNECT_MAX_ATTEMPTS`, `SESSION_HOLD_COOLDOWN_MS`.

## 6. Success criteria

- Auth files survive worker/VPS restart.
- No reconnect loop beyond 15 failures; no `clearAuth` on `replaced` / `403` storms.
- Exactly one linked phone session for OTP.
- After deploy + one scan: worker restart → `CONNECTED` within 90s without QR; zero `logout` actions over 7 days.
