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
