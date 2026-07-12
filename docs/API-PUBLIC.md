# Public API Contract

Frozen contract for downstream consumers (`ttakka-apis`, `egy-guests-apis`, `zaedl-store`, `altmiz-store`).

Base path: `/api/v1/whatsapp/public`  
Auth: header `x-api-key: sk_live_<session_key>`  
Optional: `Idempotency-Key` on all send endpoints.

## Send text message (1:1)

```http
POST /api/v1/whatsapp/public/message/send
Content-Type: application/json
x-api-key: sk_live_<session_key>
Idempotency-Key: <unique-per-operation>

{
  "phoneNumber": "201277785111",
  "content": "Hello"
}
```

**Success (200):**

```json
{ "id": "clx...", "messageId": "clx..." }
```

## Send text message (group)

Dedicated endpoint — use **either** `groupJid` **or** `inviteCode` (full WhatsApp invite URL or raw code). When `inviteCode` is provided, the session joins the group synchronously before the message is queued.

```http
POST /api/v1/whatsapp/public/groups/message/send
Content-Type: application/json
x-api-key: sk_live_<session_key>
Idempotency-Key: <unique-per-operation>

{
  "inviteCode": "https://chat.whatsapp.com/JY1ehL8WjDT5iCnCej4UiM",
  "content": "Hello group"
}
```

Or with a known group JID:

```json
{
  "groupJid": "120363123456789012@g.us",
  "content": "Hello group"
}
```

**Prerequisite:** The linked WhatsApp session must be a member of the group (auto-join runs when using `inviteCode`).

## Send text message (channel)

Dedicated endpoint — use **either** `newsletterJid` **or** `inviteCode`. When `inviteCode` is provided, the channel JID is resolved synchronously before send.

```http
POST /api/v1/whatsapp/public/channels/message/send
Content-Type: application/json
x-api-key: sk_live_<session_key>

{
  "inviteCode": "https://whatsapp.com/channel/0029VbDBuwIHbFVD3rXDzs3l",
  "content": "New channel post"
}
```

Or with a known channel JID:

```json
{
  "newsletterJid": "1234567890@newsletter",
  "content": "New channel post"
}
```

**Prerequisite:** The linked WhatsApp account must be an **admin** of the channel to post. Resolving the invite does not grant admin rights.

## List groups

```http
GET /api/v1/whatsapp/public/groups
x-api-key: sk_live_<session_key>
```

**Success (200):**

```json
{
  "groups": [
    { "jid": "120363123456789012@g.us", "subject": "مجموعه سداد داخل المواقع", "participants": 3 }
  ]
}
```

## Join group (explicit)

```http
POST /api/v1/whatsapp/public/groups/join
Content-Type: application/json
x-api-key: sk_live_<session_key>

{
  "inviteCode": "https://chat.whatsapp.com/JY1ehL8WjDT5iCnCej4UiM"
}
```

**Success (200):**

```json
{ "jid": "120363123456789012@g.us" }
```

## Resolve channel (explicit)

```http
POST /api/v1/whatsapp/public/channels/resolve
Content-Type: application/json
x-api-key: sk_live_<session_key>

{
  "inviteCode": "https://whatsapp.com/channel/0029VbDBuwIHbFVD3rXDzs3l"
}
```

**Success (200):**

```json
{
  "channel": { "jid": "1234567890@newsletter", "name": "slt-whatsap-bot", "subscribers": 1 }
}
```

## Chat history

Read messages the connected session has observed — **inbound and outbound**, 1:1, group, and channel. WhatsApp exposes no history-fetch API, so a session records messages from the moment it connects (plus the initial history sync WhatsApp pushes on link). These are **read** operations: they require only a connected session and do **not** consume send quota.

### List messages

```http
GET /api/v1/whatsapp/public/messages?chatJid=120363123456789012@g.us&limit=20
x-api-key: sk_live_<session_key>
```

Compatibility aliases (same response shape):

```http
GET /api/v1/whatsapp/public/message/list
GET /api/v1/whatsapp/public/message/history
```

Query parameters (all optional):

| Param | Meaning |
|-------|---------|
| `chatJid` | Filter to one chat. Group `...@g.us`, contact digits or `...@s.whatsapp.net`, or channel `...@newsletter`. Omit for all chats. |
| `direction` | `inbound` or `outbound`. Omit for both. |
| `limit` | 1–200, default 50. |
| `cursor` | Pass `nextCursor` from the previous page to page further back. |

**Success (200):** newest-first.

```json
{
  "messages": [
    {
      "id": "clx...",
      "messageId": "ABGGF...",
      "chatJid": "120363123456789012@g.us",
      "senderJid": "201277785111@s.whatsapp.net",
      "fromMe": false,
      "direction": "inbound",
      "isGroup": true,
      "pushName": "Ali",
      "type": "conversation",
      "content": "Hello group",
      "mediaType": null,
      "timestamp": "2026-07-01T12:00:00.000Z"
    }
  ],
  "nextCursor": "clx..."
}
```

### List messages for one chat (path form)

```http
GET /api/v1/whatsapp/public/chats/:chatJid/messages?limit=50&cursor=<id>
x-api-key: sk_live_<session_key>
```

`chatJid` can be:
- Group JID `...@g.us`
- Contact digits or `...@s.whatsapp.net`
- Channel JID `...@newsletter`

### List group messages

```http
GET /api/v1/whatsapp/public/groups/messages?groupJid=120363123456789012@g.us&limit=50
x-api-key: sk_live_<session_key>
```

Or resolve by invite code (API joins/resolves to the group JID first):

```http
GET /api/v1/whatsapp/public/groups/messages?inviteCode=https://chat.whatsapp.com/IGc4V99IZkx4MOT3wwNIY8
x-api-key: sk_live_<session_key>
```

Path variant:

```http
GET /api/v1/whatsapp/public/groups/:groupJid/messages?limit=50
x-api-key: sk_live_<session_key>
```

### List chats

```http
GET /api/v1/whatsapp/public/chats?limit=50
x-api-key: sk_live_<session_key>
```

**Success (200):**

```json
{
  "chats": [
    {
      "chatJid": "120363123456789012@g.us",
      "isGroup": true,
      "messageCount": 42,
      "lastMessageAt": "2026-07-01T12:00:00.000Z"
    }
  ]
}
```

> **Note:** History reflects what the session captured while connected — it is not a full backfill of the chat's entire past. Media messages are recorded with `mediaType` + caption (`content`); binary media is not stored.

## Send media

### 1:1

```http
POST /api/v1/whatsapp/public/media/send
x-api-key: sk_live_<session_key>
Idempotency-Key: <unique>

multipart/form-data or JSON:
  phoneNumber, mediaType, caption?, file? | mediaUrl?
```

### Group

```http
POST /api/v1/whatsapp/public/groups/media/send
```

Same fields as 1:1 media, but use `groupJid` or `inviteCode` instead of `phoneNumber`.

### Channel

```http
POST /api/v1/whatsapp/public/channels/media/send
```

Same fields as 1:1 media, but use `newsletterJid` or `inviteCode` instead of `phoneNumber`.

## Errors

| Code | Meaning |
|------|---------|
| 400 | Invalid recipient, missing field, or scope disabled |
| 401 | Missing or invalid `x-api-key` |
| 403 | Quota exhausted or scope disabled |
| 503 | Session not connected, or group join / channel resolve timed out |

## Prerequisites summary

| Target | Requirement |
|--------|-------------|
| 1:1 phone | Valid E.164-style digits |
| Group | Session is a group member (use `/groups/join` or `inviteCode` on send) |
| Channel | Session WhatsApp account is channel **admin** |
