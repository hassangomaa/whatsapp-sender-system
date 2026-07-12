/** WhatsApp Web refreshes pairing QR codes about every 20 seconds. */
export const WHATSAPP_QR_REFRESH_SECONDS = 20;

/**
 * Minimal shape of a Baileys `WAMessage.message` proto we care about for
 * chat-history persistence. Kept structural (not importing Baileys types) so
 * this helper stays pure and unit-testable without the socket library.
 */
export interface WhatsappMessageContent {
  /** Detected proto key, e.g. `conversation`, `imageMessage`. */
  type: string | null;
  /** Best-effort human-readable text (message body or media caption). */
  text: string | null;
  /** `image` | `video` | `audio` | `document` | `sticker` when media, else null. */
  mediaType: string | null;
}

/** Proto keys that carry no user-facing content — never persisted as history. */
const NON_CONTENT_TYPES = new Set([
  'messageContextInfo',
  'senderKeyDistributionMessage',
  'protocolMessage',
  'reactionMessage',
  'pollUpdateMessage',
  'keepInChatMessage',
]);

const MEDIA_TYPE_BY_KEY: Record<string, string> = {
  imageMessage: 'image',
  videoMessage: 'video',
  audioMessage: 'audio',
  documentMessage: 'document',
  documentWithCaptionMessage: 'document',
  stickerMessage: 'sticker',
  ptvMessage: 'video',
};

/**
 * Extract a normalized `{ type, text, mediaType }` from a Baileys message
 * object. Unwraps the common ephemeral / view-once / edited wrappers and pulls
 * text out of conversation, extended-text, and media captions.
 *
 * Returns all-null when there is no renderable content (e.g. protocol,
 * reaction, or key-distribution messages) so callers can skip persisting them.
 */
export function extractWhatsappMessageContent(
  message: Record<string, any> | null | undefined,
): WhatsappMessageContent {
  const empty: WhatsappMessageContent = { type: null, text: null, mediaType: null };
  let inner = message ?? null;

  // Unwrap known container messages to reach the payload.
  for (let depth = 0; depth < 5 && inner; depth += 1) {
    const wrapper =
      inner.ephemeralMessage?.message ??
      inner.viewOnceMessage?.message ??
      inner.viewOnceMessageV2?.message ??
      inner.viewOnceMessageV2Extension?.message ??
      inner.documentWithCaptionMessage?.message ??
      inner.editedMessage?.message ??
      inner.deviceSentMessage?.message;
    if (!wrapper) break;
    inner = wrapper;
  }

  if (!inner || typeof inner !== 'object') {
    return empty;
  }

  const keys = Object.keys(inner).filter((k) => inner[k] != null);
  if (keys.length === 0) {
    return empty;
  }

  // Prefer a content-bearing key over metadata / protocol keys.
  const type = keys.find((k) => !NON_CONTENT_TYPES.has(k)) ?? keys[0];

  // Nothing renderable — protocol, reaction, key-distribution, etc.
  if (NON_CONTENT_TYPES.has(type)) {
    return empty;
  }

  const mediaType = MEDIA_TYPE_BY_KEY[type] ?? null;

  let text: string | null = null;
  if (type === 'conversation') {
    text = typeof inner.conversation === 'string' ? inner.conversation : null;
  } else if (type === 'extendedTextMessage') {
    text = inner.extendedTextMessage?.text ?? null;
  } else if (mediaType) {
    text = inner[type]?.caption ?? null;
  } else if (type === 'buttonsResponseMessage') {
    text = inner.buttonsResponseMessage?.selectedDisplayText ?? null;
  } else if (type === 'listResponseMessage') {
    text = inner.listResponseMessage?.title ?? null;
  } else if (type === 'templateButtonReplyMessage') {
    text = inner.templateButtonReplyMessage?.selectedDisplayText ?? null;
  }

  return { type, text: text ?? null, mediaType };
}
