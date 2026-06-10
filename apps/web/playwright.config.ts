import path from 'path';
import { defineConfig, devices } from '@playwright/test';

const rootDir = path.resolve(__dirname, '../..');

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3011',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        cwd: rootDir,
        url: 'http://localhost:3010/health',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          BAILEYS_MOCK: '1',
          DATABASE_URL:
            process.env.DATABASE_URL ??
            'postgresql://whatsapp:whatsapp@localhost:5432/whatsapp_sender',
          REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
          JWT_SECRET: process.env.JWT_SECRET ?? 'change-me-in-production-min-32-chars',
          CORS_ORIGIN: 'http://localhost:3011',
          NEXT_PUBLIC_API_URL: 'http://localhost:3010',
        },
      },
});
