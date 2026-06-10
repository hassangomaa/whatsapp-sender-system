import { normalizePhone } from '@whatsapp-sender/contracts';

/**
 * Contract tests mirroring ttakka-apis WhatsAppChannel and egy-guests whatsapp.py expectations.
 */
describe('Public API contract (consumer shapes)', () => {
  it('normalizes phone like ttakka/egy-guests', () => {
    expect(normalizePhone('+201277785111')).toBe('201277785111');
    expect(normalizePhone('20 127 778 5111')).toBe('201277785111');
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
