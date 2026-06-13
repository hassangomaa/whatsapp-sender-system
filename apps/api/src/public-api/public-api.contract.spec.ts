import {
  normalizePhone,
  isValidGroupJid,
  isValidNewsletterJid,
  resolveMessageRecipient,
  resolveGroupRecipient,
  resolveChannelRecipient,
  resolvePhoneRecipient,
  parseGroupInviteCode,
  parseChannelInviteCode,
} from '@whatsapp-sender/contracts';

/**
 * Contract tests mirroring ttakka-apis WhatsAppChannel and egy-guests whatsapp.py expectations.
 */
describe('Public API contract (consumer shapes)', () => {
  it('normalizes phone like ttakka/egy-guests', () => {
    expect(normalizePhone('+201277785111')).toBe('201277785111');
    expect(normalizePhone('20 127 778 5111')).toBe('201277785111');
  });

  it('validates group JID format', () => {
    expect(isValidGroupJid('120363123456789012@g.us')).toBe(true);
    expect(isValidGroupJid('invalid')).toBe(false);
  });

  it('validates channel JID format', () => {
    expect(isValidNewsletterJid('1234567890@newsletter')).toBe(true);
    expect(isValidNewsletterJid('120363123456789012@g.us')).toBe(false);
  });

  it('parses invite URLs from real examples', () => {
    expect(parseGroupInviteCode('https://chat.whatsapp.com/JY1ehL8WjDT5iCnCej4UiM')).toBe(
      'JY1ehL8WjDT5iCnCej4UiM',
    );
    expect(parseChannelInviteCode('https://whatsapp.com/channel/0029VbDBuwIHbFVD3rXDzs3l')).toBe(
      '0029VbDBuwIHbFVD3rXDzs3l',
    );
  });

  it('resolves phone recipient for 1:1 send', () => {
    expect(resolvePhoneRecipient('201277785111')?.kind).toBe('phone');
    expect(resolvePhoneRecipient('invalid')).toBeNull();
  });

  it('resolves group recipient by JID or invite', () => {
    expect(resolveGroupRecipient({ groupJid: '120363123456789012@g.us' })?.recipient).toBe(
      '120363123456789012@g.us',
    );
    expect(
      resolveGroupRecipient({ inviteCode: 'https://chat.whatsapp.com/JY1ehL8WjDT5iCnCej4UiM' })
        ?.inviteCode,
    ).toBe('JY1ehL8WjDT5iCnCej4UiM');
    expect(
      resolveGroupRecipient({
        groupJid: '120363123456789012@g.us',
        inviteCode: 'abc',
      }),
    ).toBeNull();
  });

  it('resolves channel recipient by JID or invite', () => {
    expect(resolveChannelRecipient({ newsletterJid: '1234567890@newsletter' })?.kind).toBe(
      'newsletter',
    );
    expect(
      resolveChannelRecipient({
        inviteCode: 'https://whatsapp.com/channel/0029VbDBuwIHbFVD3rXDzs3l',
      })?.inviteCode,
    ).toBe('0029VbDBuwIHbFVD3rXDzs3l');
  });

  it('legacy resolveMessageRecipient still supports all kinds', () => {
    expect(resolveMessageRecipient({ phoneNumber: '201277785111' })?.kind).toBe('phone');
    expect(resolveMessageRecipient({ groupJid: '120363123456789012@g.us' })?.kind).toBe('group');
    expect(resolveMessageRecipient({ newsletterJid: '1234567890@newsletter' })?.kind).toBe(
      'newsletter',
    );
    expect(resolveMessageRecipient({})).toBeNull();
  });

  it('defines expected send request shape', () => {
    const payload = { phoneNumber: '201277785111', content: 'Hello from test' };
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': 'sk_test_key',
      'Idempotency-Key': 'contact.submitted:1:whatsapp',
    };
    expect(headers['x-api-key']).toBeTruthy();
    expect(headers['Idempotency-Key']).toContain('whatsapp');
    expect(payload.phoneNumber).toMatch(/^\d+$/);
  });

  it('accepts success response with id or messageId', () => {
    const responses = [{ id: 'msg-1' }, { messageId: 'msg-1' }, { status: 'sent', messageId: 'msg-1' }];
    for (const body of responses) {
      expect(body.id ?? body.messageId).toBeTruthy();
    }
  });
});
