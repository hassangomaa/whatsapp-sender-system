import { extractWhatsappMessageContent } from './whatsapp';

describe('extractWhatsappMessageContent', () => {
  it('reads a plain conversation body', () => {
    const out = extractWhatsappMessageContent({ conversation: 'Hello group' });
    expect(out).toEqual({ type: 'conversation', text: 'Hello group', mediaType: null });
  });

  it('reads extended text (quoted / link preview) messages', () => {
    const out = extractWhatsappMessageContent({
      extendedTextMessage: { text: 'check this https://x.y' },
    });
    expect(out.type).toBe('extendedTextMessage');
    expect(out.text).toBe('check this https://x.y');
    expect(out.mediaType).toBeNull();
  });

  it('extracts caption and media type from an image message', () => {
    const out = extractWhatsappMessageContent({
      imageMessage: { caption: 'nice pic', mimetype: 'image/jpeg' },
    });
    expect(out).toEqual({ type: 'imageMessage', text: 'nice pic', mediaType: 'image' });
  });

  it('reports media type even when caption is absent', () => {
    const out = extractWhatsappMessageContent({ audioMessage: { seconds: 3 } });
    expect(out.mediaType).toBe('audio');
    expect(out.text).toBeNull();
  });

  it('unwraps ephemeral-wrapped messages', () => {
    const out = extractWhatsappMessageContent({
      ephemeralMessage: { message: { conversation: 'disappearing' } },
    });
    expect(out.text).toBe('disappearing');
    expect(out.type).toBe('conversation');
  });

  it('unwraps viewOnce-wrapped media', () => {
    const out = extractWhatsappMessageContent({
      viewOnceMessageV2: { message: { imageMessage: { caption: 'secret' } } },
    });
    expect(out).toEqual({ type: 'imageMessage', text: 'secret', mediaType: 'image' });
  });

  it('prefers content key over messageContextInfo metadata', () => {
    const out = extractWhatsappMessageContent({
      messageContextInfo: { deviceListMetadata: {} },
      conversation: 'real body',
    });
    expect(out.type).toBe('conversation');
    expect(out.text).toBe('real body');
  });

  it('returns all-null for empty / protocol-only messages', () => {
    expect(extractWhatsappMessageContent(null)).toEqual({
      type: null,
      text: null,
      mediaType: null,
    });
    expect(extractWhatsappMessageContent({})).toEqual({
      type: null,
      text: null,
      mediaType: null,
    });
  });
});
