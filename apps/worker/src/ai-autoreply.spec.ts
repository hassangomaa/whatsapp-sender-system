jest.mock('./redis', () => ({ redis: {} }));
jest.mock('@whatsapp-sender/database', () => ({ prisma: {}, Prisma: {} }));

import {
  buildContents,
  generateReply,
  loadAutoReplyConfig,
  shouldAutoReply,
} from './ai-autoreply';

const cfg = loadAutoReplyConfig({
  AI_AUTOREPLY_ENABLED: '1',
  GEMINI_API_KEY: 'k',
  AI_AUTOREPLY_SESSION_IDS: 's1, s2',
});

const row = (over: Partial<Parameters<typeof shouldAutoReply>[2]> = {}) => ({
  chatJid: '201000000000@s.whatsapp.net',
  fromMe: false,
  isGroup: false,
  content: 'hello',
  messageType: 'conversation',
  ...over,
});

describe('loadAutoReplyConfig', () => {
  it('is disabled without the flag or the key', () => {
    expect(loadAutoReplyConfig({ AI_AUTOREPLY_ENABLED: '1' }).enabled).toBe(false);
    expect(loadAutoReplyConfig({ GEMINI_API_KEY: 'k' }).enabled).toBe(false);
    expect(cfg.enabled).toBe(true);
    expect([...cfg.sessionIds]).toEqual(['s1', 's2']);
  });
});

describe('shouldAutoReply', () => {
  it('answers inbound 1:1 text on an allowed session', () => {
    expect(shouldAutoReply(cfg, 's1', row())).toBe(true);
    expect(shouldAutoReply(cfg, 's1', row({ chatJid: '123@lid', messageType: 'extendedTextMessage' }))).toBe(true);
  });

  it('never answers own, group, status, newsletter, empty or media messages', () => {
    expect(shouldAutoReply(cfg, 's1', row({ fromMe: true }))).toBe(false);
    expect(shouldAutoReply(cfg, 's1', row({ isGroup: true, chatJid: '1@g.us' }))).toBe(false);
    expect(shouldAutoReply(cfg, 's1', row({ chatJid: 'status@broadcast' }))).toBe(false);
    expect(shouldAutoReply(cfg, 's1', row({ chatJid: '1@newsletter' }))).toBe(false);
    expect(shouldAutoReply(cfg, 's1', row({ content: '  ' }))).toBe(false);
    expect(shouldAutoReply(cfg, 's1', row({ messageType: 'imageMessage' }))).toBe(false);
  });

  it('respects the session allow-list', () => {
    expect(shouldAutoReply(cfg, 's9', row())).toBe(false);
    const all = loadAutoReplyConfig({ AI_AUTOREPLY_ENABLED: '1', GEMINI_API_KEY: 'k' });
    expect(shouldAutoReply(all, 's9', row())).toBe(true);
  });
});

describe('buildContents', () => {
  it('maps history to alternating user/model turns starting with user and ending with the latest', () => {
    const contents = buildContents(
      [
        { fromMe: true, content: 'welcome' },
        { fromMe: false, content: 'hi' },
        { fromMe: false, content: 'price?' },
        { fromMe: true, content: '10' },
      ],
      'ok thanks',
    );
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'hi\nprice?' }] },
      { role: 'model', parts: [{ text: '10' }] },
      { role: 'user', parts: [{ text: 'ok thanks' }] },
    ]);
  });

  it('does not duplicate the latest message when history already contains it', () => {
    const contents = buildContents([{ fromMe: false, content: 'hi' }], 'hi');
    expect(contents).toEqual([{ role: 'user', parts: [{ text: 'hi' }] }]);
  });
});

describe('generateReply', () => {
  it('retries a transient 503 then falls back to the secondary model', async () => {
    const call = jest
      .fn()
      .mockResolvedValueOnce({ text: null, status: 503 })
      .mockResolvedValueOnce({ text: null, status: 503 })
      .mockResolvedValueOnce({ text: 'from lite', status: 200 });
    await expect(generateReply(cfg, [], call)).resolves.toBe('from lite');
    expect(call).toHaveBeenCalledTimes(3);
    expect(call.mock.calls[2][1]).toBe(cfg.fallbackModel);
  });

  it('does not retry non-transient errors on the same model', async () => {
    const call = jest.fn().mockResolvedValue({ text: null, status: 400 });
    await expect(generateReply(cfg, [], call)).resolves.toBeNull();
    expect(call).toHaveBeenCalledTimes(2); // primary once, fallback once
  });
});
