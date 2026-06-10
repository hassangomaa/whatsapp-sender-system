import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/** Load monorepo root .env before Nest/Prisma initialize. */
function loadEnvFile() {
  const root = resolve(__dirname, '../../..');
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://whatsapp:whatsapp@localhost:5432/whatsapp_sender';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}
