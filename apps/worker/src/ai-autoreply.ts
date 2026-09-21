import { Prisma, prisma } from '@whatsapp-sender/database';
import { redis } from './redis';

/**
 * Gemini-powered auto-reply for inbound 1:1 WhatsApp messages.
 *
 * Enabled by AI_AUTOREPLY_ENABLED=1 + GEMINI_API_KEY. Scope with
 * AI_AUTOREPLY_SESSION_IDS (comma list; empty = every session). Groups, status
 * broadcasts, own messages and non-text messages are never answered. Per-contact
 * rate limits live in Redis so a chatty contact cannot burn the quota.
 */

export interface AutoReplyConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
  fallbackModel: string;
  sessionIds: Set<string>;
  systemPrompt: string;
  historyLimit: number;
  maxPerHour: number;
  cooldownMs: number;
  timeoutMs: number;
}

const DEFAULT_SYSTEM_PROMPT = [
  'You are the WhatsApp assistant for this business account.',
  'Reply in the same language the customer writes in (Arabic or English).',
  'Be brief (max ~4 short lines), warm and professional. Use plain text only — no markdown.',
  'If you do not know something, say a team member will follow up. Never invent prices, dates or promises.',
].join(' ');

export function loadAutoReplyConfig(env: NodeJS.ProcessEnv = process.env): AutoReplyConfig {
  const ids = (env.AI_AUTOREPLY_SESSION_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    enabled: env.AI_AUTOREPLY_ENABLED === '1' && Boolean(env.GEMINI_API_KEY),
    apiKey: env.GEMINI_API_KEY ?? '',
    model: env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    fallbackModel: env.GEMINI_FALLBACK_MODEL ?? 'gemini-2.5-flash-lite',
    sessionIds: new Set(ids),
    systemPrompt: env.AI_AUTOREPLY_SYSTEM_PROMPT?.trim() || DEFAULT_SYSTEM_PROMPT,
    historyLimit: Number(env.AI_AUTOREPLY_HISTORY ?? 10),
    maxPerHour: Number(env.AI_AUTOREPLY_MAX_PER_HOUR ?? 30),
    cooldownMs: Number(env.AI_AUTOREPLY_COOLDOWN_MS ?? 3000),
    timeoutMs: Number(env.GEMINI_TIMEOUT_MS ?? 30_000),
  };
}

export type InboundRow = Pick<
  Prisma.ChatMessageCreateManyInput,
  'chatJid' | 'fromMe' | 'isGroup' | 'content' | 'messageType'
>;

/** Pure gate: only inbound, 1:1, text-bearing messages qualify. */
export function shouldAutoReply(cfg: AutoReplyConfig, sessionId: string, row: InboundRow): boolean {
  if (!cfg.enabled) return false;
  if (cfg.sessionIds.size > 0 && !cfg.sessionIds.has(sessionId)) return false;
  if (row.fromMe || row.isGroup) return false;
  if (row.chatJid === 'status@broadcast' || row.chatJid.endsWith('@newsletter')) return false;
  if (!row.chatJid.endsWith('@s.whatsapp.net') && !row.chatJid.endsWith('@lid')) return false;
  const text = (row.content ?? '').trim();
  if (!text) return false;
  return row.messageType === 'conversation' || row.messageType === 'extendedTextMessage';
}

interface HistoryTurn {
  fromMe: boolean;
  content: string | null;
}

/** Gemini `contents` from chat history (oldest first), ending with the new user message. */
export function buildContents(history: HistoryTurn[], latest: string) {
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const turn of history) {
    const text = (turn.content ?? '').trim();
    if (!text) continue;
    const role = turn.fromMe ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n${text}`;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }
  // Gemini requires the conversation to start with a user turn and end with one.
  while (contents.length && contents[0].role === 'model') contents.shift();
  const last = contents[contents.length - 1];
  if (last && last.role === 'user' && last.parts[0].text === latest) {
    return contents;
  }
  contents.push({ role: 'user', parts: [{ text: latest }] });
  return contents;
}

const TRANSIENT = new Set([429, 500, 502, 503, 504]);

async function callGemini(
  cfg: AutoReplyConfig,
  model: string,
  contents: ReturnType<typeof buildContents>,
): Promise<{ text: string | null; status: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: cfg.systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.5, maxOutputTokens: 400 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { text: null, status: res.status };
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? '';
    return { text: text || null, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

/** Retry transient errors on the primary model, then once on the fallback. */
export async function generateReply(
  cfg: AutoReplyConfig,
  contents: ReturnType<typeof buildContents>,
  call: typeof callGemini = callGemini,
): Promise<string | null> {
  const plan: { model: string; attempts: number }[] = [{ model: cfg.model, attempts: 2 }];
  if (cfg.fallbackModel && cfg.fallbackModel !== cfg.model) {
    plan.push({ model: cfg.fallbackModel, attempts: 1 });
  }
  let lastStatus = 0;
  for (const { model, attempts } of plan) {
    for (let i = 0; i < attempts; i++) {
      const { text, status } = await call(cfg, model, contents);
      if (text) return text;
      lastStatus = status;
      if (!TRANSIENT.has(status)) break;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  console.warn(`[ai-autoreply] gemini failed (last status ${lastStatus})`);
  return null;
}

/**
 * Redis-backed guards. `persistChatMessages` returns rows before dedupe, so the
 * per-message key makes a reply exactly-once even when WhatsApp re-delivers.
 * Then a short per-contact cooldown + hourly cap.
 */
async function allowedByRateLimit(
  cfg: AutoReplyConfig,
  sessionId: string,
  chatJid: string,
  waMessageId: string,
) {
  const seen = await redis.set(`ai:seen:${sessionId}:${waMessageId}`, '1', 'EX', 86_400, 'NX');
  if (!seen) return false;
  const cooldownKey = `ai:cooldown:${sessionId}:${chatJid}`;
  const hourKey = `ai:hour:${sessionId}:${chatJid}`;
  const ok = await redis.set(cooldownKey, '1', 'PX', cfg.cooldownMs, 'NX');
  if (!ok) return false;
  const count = await redis.incr(hourKey);
  if (count === 1) await redis.expire(hourKey, 3600);
  return count <= cfg.maxPerHour;
}

export async function maybeAutoReply(
  sessionId: string,
  rows: Prisma.ChatMessageCreateManyInput[],
  send: (jid: string, text: string) => Promise<unknown>,
  cfg: AutoReplyConfig = loadAutoReplyConfig(),
) {
  if (!cfg.enabled) return;
  // One reply per chat per batch — answer the latest text message only.
  const byChat = new Map<string, Prisma.ChatMessageCreateManyInput>();
  for (const row of rows) {
    if (shouldAutoReply(cfg, sessionId, row)) byChat.set(row.chatJid, row);
  }
  for (const [chatJid, row] of byChat) {
    try {
      if (!(await allowedByRateLimit(cfg, sessionId, chatJid, row.waMessageId))) {
        console.warn(`[ai-autoreply] rate-limited ${sessionId} ${chatJid}`);
        continue;
      }
      const history = await prisma.chatMessage.findMany({
        where: { sessionId, chatJid },
        orderBy: { timestamp: 'desc' },
        take: cfg.historyLimit,
        select: { fromMe: true, content: true },
      });
      const contents = buildContents(history.reverse(), (row.content ?? '').trim());
      const reply = await generateReply(cfg, contents);
      if (!reply) continue;
      await send(chatJid, reply);
      console.log(`[ai-autoreply] replied ${sessionId} ${chatJid} (${reply.length} chars)`);
    } catch (err) {
      console.error(`[ai-autoreply] failed ${sessionId} ${chatJid}`, err);
    }
  }
}
