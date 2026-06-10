import { prisma } from '@whatsapp-sender/database';
import { sessionManager } from './session-manager';
import { startWorkers } from './processors';
import { startHealthLoop } from './health-loop';

async function main() {
  await prisma.$connect();
  console.log('Worker connected to database');

  startWorkers();
  const stopHealth = startHealthLoop();

  await sessionManager.restoreConnectedSessions();

  const shutdown = async () => {
    console.log('Shutting down worker...');
    stopHealth();
    await sessionManager.shutdown();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
