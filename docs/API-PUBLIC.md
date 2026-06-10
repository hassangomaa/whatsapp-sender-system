# Public API Contract

Frozen contract for downstream consumers (`ttakka-apis`, `egy-guests-apis`).

## Send text message

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

## Send media

```http
POST /api/v1/whatsapp/public/media/send
x-api-key: sk_live_<session_key>
Idempotency-Key: <unique>

multipart/form-data or JSON:
  phoneNumber, mediaType, caption?, file? | mediaUrl?
```

## Errors

| Code | Meaning |
|------|---------|
| 401 | Missing or invalid `x-api-key` |
| 403 | Quota exhausted or scope disabled |
| 503 | Session not connected |
