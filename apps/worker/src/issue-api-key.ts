import { generateApiKey } from '@whatsapp-sender/contracts';
import { prisma } from '@whatsapp-sender/database';
import { publishSessionEvent } from './redis';

/** Generate and persist API key when session first connects (idempotent). */
export async function issueApiKeyIfNeeded(sessionId: string): Promise<string | null> {
  const session = await prisma.whatsappSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;
  if (session.apiKeyHash) return null;

  const { key, prefix, hash } = generateApiKey();
  await prisma.whatsappSession.update({
    where: { id: sessionId },
    data: { apiKeyHash: hash, apiKeyPrefix: prefix },
  });

  await publishSessionEvent(sessionId, {
    type: 'api_key_ready',
    sessionId,
    apiKey: key,
    status: 'connected',
  });

  return key;
}
