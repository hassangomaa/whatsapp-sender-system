/** WhatsApp group JID: numeric id + @g.us */
const GROUP_JID_RE = /^\d+@g\.us$/;
/** WhatsApp channel / newsletter JID */
const NEWSLETTER_JID_RE = /^\d+@newsletter$/;

export function isValidGroupJid(groupJid: string): boolean {
  return GROUP_JID_RE.test(groupJid.trim());
}

export function isValidNewsletterJid(newsletterJid: string): boolean {
  return NEWSLETTER_JID_RE.test(newsletterJid.trim());
}

export function normalizeGroupJid(groupJid: string): string {
  return groupJid.trim();
}

export function normalizeNewsletterJid(newsletterJid: string): string {
  return newsletterJid.trim();
}

/** Extract invite code from chat.whatsapp.com/INVITE or raw code. */
export function parseGroupInviteCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);
  return match?.[1] ?? trimmed;
}

/** Extract invite code from whatsapp.com/channel/INVITE or raw code. */
export function parseChannelInviteCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/channel\/([A-Za-z0-9_-]+)/i);
  return match?.[1] ?? trimmed;
}

/** Build Baileys JID from phone digits, group JID, or newsletter JID. */
export function buildMessageJid(recipient: string): string {
  const trimmed = recipient.trim();
  if (trimmed.endsWith('@g.us') || trimmed.endsWith('@newsletter')) {
    return trimmed;
  }
  return `${trimmed.replace(/\D/g, '')}@s.whatsapp.net`;
}

export type RecipientKind = 'phone' | 'group' | 'newsletter';

export interface MessageRecipient {
  /** Stored in DB / job — phone digits or full JID */
  recipient: string;
  kind: RecipientKind;
}

export function resolveMessageRecipient(payload: {
  phoneNumber?: string;
  groupJid?: string;
  newsletterJid?: string;
}): MessageRecipient | null {
  if (payload.newsletterJid) {
    const normalized = normalizeNewsletterJid(payload.newsletterJid);
    if (!isValidNewsletterJid(normalized)) {
      return null;
    }
    return { recipient: normalized, kind: 'newsletter' };
  }
  if (payload.groupJid) {
    const normalized = normalizeGroupJid(payload.groupJid);
    if (!isValidGroupJid(normalized)) {
      return null;
    }
    return { recipient: normalized, kind: 'group' };
  }
  if (payload.phoneNumber) {
    const digits = payload.phoneNumber.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      return null;
    }
    return { recipient: digits, kind: 'phone' };
  }
  return null;
}

export interface ResolvedGroupRecipient {
  recipient: string;
  kind: 'group';
  /** Set when API must join via invite before send */
  inviteCode?: string;
}

export interface ResolvedChannelRecipient {
  recipient: string;
  kind: 'newsletter';
  /** Set when API must resolve invite before send */
  inviteCode?: string;
}

/** Exactly one of groupJid or inviteCode required. */
export function resolveGroupRecipient(payload: {
  groupJid?: string;
  inviteCode?: string;
}): ResolvedGroupRecipient | null {
  const hasJid = Boolean(payload.groupJid?.trim());
  const hasInvite = Boolean(payload.inviteCode?.trim());
  if (hasJid === hasInvite) {
    return null;
  }

  if (hasJid) {
    const normalized = normalizeGroupJid(payload.groupJid!);
    if (!isValidGroupJid(normalized)) {
      return null;
    }
    return { recipient: normalized, kind: 'group' };
  }

  const code = parseGroupInviteCode(payload.inviteCode!);
  if (code.length < 5) {
    return null;
  }
  return { recipient: '', kind: 'group', inviteCode: code };
}

/** Exactly one of newsletterJid or inviteCode required. */
export function resolveChannelRecipient(payload: {
  newsletterJid?: string;
  inviteCode?: string;
}): ResolvedChannelRecipient | null {
  const hasJid = Boolean(payload.newsletterJid?.trim());
  const hasInvite = Boolean(payload.inviteCode?.trim());
  if (hasJid === hasInvite) {
    return null;
  }

  if (hasJid) {
    const normalized = normalizeNewsletterJid(payload.newsletterJid!);
    if (!isValidNewsletterJid(normalized)) {
      return null;
    }
    return { recipient: normalized, kind: 'newsletter' };
  }

  const code = parseChannelInviteCode(payload.inviteCode!);
  if (code.length < 5) {
    return null;
  }
  return { recipient: '', kind: 'newsletter', inviteCode: code };
}

export function resolvePhoneRecipient(phoneNumber?: string): MessageRecipient | null {
  return resolveMessageRecipient({ phoneNumber });
}
