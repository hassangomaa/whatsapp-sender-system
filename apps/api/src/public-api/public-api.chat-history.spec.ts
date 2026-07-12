import { ServiceUnavailableException } from '@nestjs/common';
import { SessionStatus } from '@whatsapp-sender/database';
import { PublicApiService } from './public-api.service';

describe('PublicApiService — chat history', () => {
  const chatMessage = {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  };
  const prisma = { client: { chatMessage } };
  const sessions = { findByApiKey: jest.fn() };
  const usage = { assertCanSend: jest.fn() };
  const noQueue = { add: jest.fn() } as never;

  const service = new PublicApiService(
    prisma as never,
    sessions as never,
    usage as never,
    noQueue,
    noQueue,
    noQueue,
    noQueue,
  );

  const connectedSession = {
    id: 'sess-1',
    workspaceId: 'ws-1',
    status: SessionStatus.CONNECTED,
    scopeSend: true,
    scopeMedia: true,
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects a missing api key', async () => {
    await expect(service.listChatMessages(undefined as never, {})).rejects.toBeInstanceOf(
      Error,
    );
  });

  it('rejects a disconnected session', async () => {
    sessions.findByApiKey.mockResolvedValue({ ...connectedSession, status: SessionStatus.DISCONNECTED });
    await expect(service.listChatMessages('sk_live_x', {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does NOT require send scope for reads (read scope)', async () => {
    sessions.findByApiKey.mockResolvedValue({ ...connectedSession, scopeSend: false });
    chatMessage.findMany.mockResolvedValue([]);
    await expect(service.listChatMessages('sk_live_x', {})).resolves.toEqual({
      messages: [],
      nextCursor: null,
    });
  });

  it('scopes the query to the session and maps rows newest-first', async () => {
    sessions.findByApiKey.mockResolvedValue(connectedSession);
    chatMessage.findMany.mockResolvedValue([
      {
        id: 'c1',
        waMessageId: 'W1',
        chatJid: '120363@g.us',
        senderJid: '20127@s.whatsapp.net',
        fromMe: false,
        direction: 'INBOUND',
        isGroup: true,
        pushName: 'Ali',
        messageType: 'conversation',
        content: 'hi',
        mediaType: null,
        timestamp: new Date('2026-07-01T00:00:00Z'),
      },
    ]);

    const res = await service.listChatMessages('sk_live_x', {});

    expect(chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: 'sess-1' },
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(res.messages[0]).toMatchObject({
      id: 'c1',
      messageId: 'W1',
      direction: 'inbound',
      type: 'conversation',
      content: 'hi',
    });
    expect(res.nextCursor).toBeNull();
  });

  it('filters by chatJid (built into a JID) and direction', async () => {
    sessions.findByApiKey.mockResolvedValue(connectedSession);
    chatMessage.findMany.mockResolvedValue([]);

    await service.listChatMessages('sk_live_x', {
      chatJid: '201277785111',
      direction: 'outbound',
    });

    expect(chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sessionId: 'sess-1',
          chatJid: '201277785111@s.whatsapp.net',
          direction: 'OUTBOUND',
        },
      }),
    );
  });

  it('returns nextCursor when there is another page', async () => {
    sessions.findByApiKey.mockResolvedValue(connectedSession);
    // limit 2 → service asks for 3; returning 3 signals hasMore.
    const row = (id: string) => ({
      id,
      waMessageId: id,
      chatJid: '120363@g.us',
      senderJid: null,
      fromMe: true,
      direction: 'OUTBOUND',
      isGroup: true,
      pushName: null,
      messageType: 'conversation',
      content: 'x',
      mediaType: null,
      timestamp: new Date(),
    });
    chatMessage.findMany.mockResolvedValue([row('a'), row('b'), row('c')]);

    const res = await service.listChatMessages('sk_live_x', { limit: 2 });

    expect(chatMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
    expect(res.messages).toHaveLength(2);
    expect(res.nextCursor).toBe('b');
  });

  it('falls back to default limit when limit is NaN', async () => {
    sessions.findByApiKey.mockResolvedValue(connectedSession);
    chatMessage.findMany.mockResolvedValue([]);

    await service.listChatMessages('sk_live_x', { limit: Number.NaN });

    expect(chatMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 51 }));
  });

  it('lists chats via groupBy, newest-active first', async () => {
    sessions.findByApiKey.mockResolvedValue(connectedSession);
    chatMessage.groupBy.mockResolvedValue([
      {
        chatJid: '120363@g.us',
        isGroup: true,
        _count: { _all: 5 },
        _max: { timestamp: new Date('2026-07-01T00:00:00Z') },
      },
    ]);

    const res = await service.listChats('sk_live_x', {});

    expect(chatMessage.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['chatJid', 'isGroup'],
        where: { sessionId: 'sess-1' },
        orderBy: { _max: { timestamp: 'desc' } },
      }),
    );
    expect(res.chats[0]).toEqual({
      chatJid: '120363@g.us',
      isGroup: true,
      messageCount: 5,
      lastMessageAt: new Date('2026-07-01T00:00:00Z'),
    });
  });

  it('lists group messages by groupJid', async () => {
    sessions.findByApiKey.mockResolvedValue(connectedSession);
    chatMessage.findMany.mockResolvedValue([]);

    await service.listGroupMessages('sk_live_x', { groupJid: '120363123456789012@g.us', limit: 10 });

    expect(chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionId: 'sess-1',
          chatJid: '120363123456789012@g.us',
        }),
        take: 11,
      }),
    );
  });

  it('requires either groupJid or inviteCode for group history', async () => {
    sessions.findByApiKey.mockResolvedValue(connectedSession);

    await expect(service.listGroupMessages('sk_live_x', {})).rejects.toBeInstanceOf(Error);
  });

});
