import { ChatDirection, Prisma, prisma } from '@whatsapp-sender/database';
import { extractWhatsappMessageContent } from '@whatsapp-sender/contracts';

/** Baileys `messageTimestamp` may be a number or a Long-like object. */
function toDate(ts: unknown): Date {
  let seconds = 0;
  if (typeof ts === 'number') {
    seconds = ts;
  } else if (ts && typeof (ts as { toNumber?: () => number }).toNumber === 'function') {
    seconds = (ts as { toNumber: () => number }).toNumber();
  } else if (ts != null) {
    seconds = Number(ts);
  }
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date();
}

/**
 * Map a raw Baileys `WAMessage` into a `ChatMessage` row, or `null` when the
 * message has no renderable content (protocol / reaction / key messages) or is
 * a status broadcast we do not want in chat history.
 */
export function mapWaMessage(
  sessionId: string,
  workspaceId: string,
  msg: any,
): Prisma.ChatMessageCreateManyInput | null {
  const waMessageId: string | undefined = msg?.key?.id ?? undefined;
  const chatJid: string | undefined = msg?.key?.remoteJid ?? undefined;
  if (!waMessageId || !chatJid || chatJid === 'status@broadcast') {
    return null;
  }

  const { type, text, mediaType } = extractWhatsappMessageContent(msg?.message);
  if (!type) {
    return null;
  }

  const fromMe = Boolean(msg?.key?.fromMe);
  const isGroup = chatJid.endsWith('@g.us');
  const senderJid: string | null = msg?.key?.participant ?? (fromMe ? null : chatJid);

  return {
    workspaceId,
    sessionId,
    waMessageId,
    chatJid,
    senderJid,
    fromMe,
    direction: fromMe ? ChatDirection.OUTBOUND : ChatDirection.INBOUND,
    isGroup,
    pushName: msg?.pushName ?? null,
    messageType: type,
    content: text ?? null,
    mediaType,
    timestamp: toDate(msg?.messageTimestamp),
  };
}

/**
 * Persist a batch of Baileys messages as chat history. Idempotent — duplicates
 * (same session + WhatsApp message id) are skipped, so history re-syncs and
 * `notify`/`append` overlaps are safe. Returns the rows that were mapped
 * (before dedupe) so callers can decide on side effects like webhooks.
 */
export async function persistChatMessages(
  sessionId: string,
  workspaceId: string,
  messages: any[],
): Promise<Prisma.ChatMessageCreateManyInput[]> {
  const rows = messages
    .map((m) => mapWaMessage(sessionId, workspaceId, m))
    .filter((r): r is Prisma.ChatMessageCreateManyInput => r !== null);

  if (rows.length === 0) {
    return [];
  }

  await prisma.chatMessage.createMany({ data: rows, skipDuplicates: true });
  return rows;
}
