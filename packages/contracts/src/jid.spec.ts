import {
  parseChannelInviteCode,
  parseGroupInviteCode,
  resolveChannelRecipient,
  resolveGroupRecipient,
  resolvePhoneRecipient,
} from './jid';

describe('jid helpers', () => {
  it('parses group invite URLs', () => {
    expect(parseGroupInviteCode('https://chat.whatsapp.com/JY1ehL8WjDT5iCnCej4UiM')).toBe(
      'JY1ehL8WjDT5iCnCej4UiM',
    );
  });

  it('parses channel invite URLs', () => {
    expect(parseChannelInviteCode('https://whatsapp.com/channel/0029VbDBuwIHbFVD3rXDzs3l')).toBe(
      '0029VbDBuwIHbFVD3rXDzs3l',
    );
  });

  it('resolves group JID recipient', () => {
    const r = resolveGroupRecipient({ groupJid: '120363123456789012@g.us' });
    expect(r?.kind).toBe('group');
    expect(r?.recipient).toBe('120363123456789012@g.us');
    expect(r?.inviteCode).toBeUndefined();
  });

  it('resolves group invite code recipient', () => {
    const r = resolveGroupRecipient({
      inviteCode: 'https://chat.whatsapp.com/JY1ehL8WjDT5iCnCej4UiM',
    });
    expect(r?.inviteCode).toBe('JY1ehL8WjDT5iCnCej4UiM');
    expect(r?.recipient).toBe('');
  });

  it('rejects group when both jid and invite provided', () => {
    expect(
      resolveGroupRecipient({
        groupJid: '120363123456789012@g.us',
        inviteCode: 'abc',
      }),
    ).toBeNull();
  });

  it('resolves channel JID recipient', () => {
    const r = resolveChannelRecipient({ newsletterJid: '1234567890@newsletter' });
    expect(r?.recipient).toBe('1234567890@newsletter');
  });

  it('resolves channel invite code recipient', () => {
    const r = resolveChannelRecipient({
      inviteCode: 'https://whatsapp.com/channel/0029VbDBuwIHbFVD3rXDzs3l',
    });
    expect(r?.inviteCode).toBe('0029VbDBuwIHbFVD3rXDzs3l');
  });

  it('resolves phone-only recipient', () => {
    expect(resolvePhoneRecipient('201277785111')?.kind).toBe('phone');
  });
});
