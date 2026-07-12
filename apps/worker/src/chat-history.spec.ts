const mockCreateMany = jest.fn().mockResolvedValue({ count: 0 });

jest.mock('@whatsapp-sender/database', () => ({
  ChatDirection: { INBOUND: 'INBOUND', OUTBOUND: 'OUTBOUND' },
  Prisma: {},
  prisma: {
    chatMessage: {
      createMany: (...args: unknown[]) => mockCreateMany(...args),
    },
  },
}));

import { mapWaMessage, persistChatMessages } from './chat-history';

const SESSION = 'sess-1';
const WORKSPACE = 'ws-1';

describe('mapWaMessage', () => {
  it('maps an inbound group text message', () => {
    const row = mapWaMessage(SESSION, WORKSPACE, {
      key: {
        id: 'MSG1',
        remoteJid: '120363123456789012@g.us',
        fromMe: false,
        participant: '201277785111@s.whatsapp.net',
      },
      pushName: 'Ali',
      messageTimestamp: 1700000000,
      message: { conversation: 'Hello group' },
    });

    expect(row).toMatchObject({
      sessionId: SESSION,
      workspaceId: WORKSPACE,
      waMessageId: 'MSG1',
      chatJid: '120363123456789012@g.us',
      senderJid: '201277785111@s.whatsapp.net',
      fromMe: false,
      direction: 'INBOUND',
      isGroup: true,
      pushName: 'Ali',
      messageType: 'conversation',
      content: 'Hello group',
      mediaType: null,
    });
    expect(row?.timestamp).toEqual(new Date(1700000000 * 1000));
  });

  it('maps an outbound 1:1 message with OUTBOUND direction', () => {
    const row = mapWaMessage(SESSION, WORKSPACE, {
      key: { id: 'MSG2', remoteJid: '201277785111@s.whatsapp.net', fromMe: true },
      messageTimestamp: 1700000100,
      message: { extendedTextMessage: { text: 'reply' } },
    });
    expect(row?.direction).toBe('OUTBOUND');
    expect(row?.fromMe).toBe(true);
    expect(row?.isGroup).toBe(false);
    expect(row?.senderJid).toBeNull();
    expect(row?.content).toBe('reply');
  });

  it('handles Long-like messageTimestamp objects', () => {
    const row = mapWaMessage(SESSION, WORKSPACE, {
      key: { id: 'MSG3', remoteJid: '201277785111@s.whatsapp.net', fromMe: false },
      messageTimestamp: { toNumber: () => 1700000200 },
      message: { conversation: 'hi' },
    });
    expect(row?.timestamp).toEqual(new Date(1700000200 * 1000));
  });

  it('skips status broadcasts', () => {
    const row = mapWaMessage(SESSION, WORKSPACE, {
      key: { id: 'MSG4', remoteJid: 'status@broadcast', fromMe: false },
      message: { conversation: 'status' },
    });
    expect(row).toBeNull();
  });

  it('skips messages without id or renderable content', () => {
    expect(
      mapWaMessage(SESSION, WORKSPACE, {
        key: { remoteJid: '201277785111@s.whatsapp.net' },
        message: { conversation: 'no id' },
      }),
    ).toBeNull();
    expect(
      mapWaMessage(SESSION, WORKSPACE, {
        key: { id: 'MSG5', remoteJid: '201277785111@s.whatsapp.net' },
        message: { protocolMessage: {} },
      }),
    ).toBeNull();
  });
});

describe('persistChatMessages', () => {
  beforeEach(() => mockCreateMany.mockClear());

  it('writes mapped rows with skipDuplicates and ignores empty batches', async () => {
    const written = await persistChatMessages(SESSION, WORKSPACE, [
      {
        key: { id: 'A', remoteJid: '201277785111@s.whatsapp.net', fromMe: false },
        messageTimestamp: 1700000000,
        message: { conversation: 'one' },
      },
      { key: { id: 'B', remoteJid: 'status@broadcast' }, message: { conversation: 'skip' } },
    ]);

    expect(written).toHaveLength(1);
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([expect.objectContaining({ waMessageId: 'A' })]),
      skipDuplicates: true,
    });
  });

  it('does not call the database when nothing is persistable', async () => {
    const written = await persistChatMessages(SESSION, WORKSPACE, [
      { key: { id: 'C', remoteJid: 'status@broadcast' }, message: { conversation: 'x' } },
    ]);
    expect(written).toHaveLength(0);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });
});
