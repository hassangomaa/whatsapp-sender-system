import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.plan.upsert({
    where: { slug: 'trial' },
    update: {},
    create: {
      slug: 'trial',
      name: 'Trial',
      messageLimit: 30,
      maxSessions: 1,
      sendRateLimitMs: 3000,
      priceCents: 0,
      isTrial: true,
      active: true,
    },
  });

  await prisma.plan.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      slug: 'starter',
      name: 'Starter',
      messageLimit: 500,
      maxSessions: 3,
      sendRateLimitMs: 2500,
      priceCents: 9900,
      isTrial: false,
      active: true,
    },
  });

  await prisma.plan.upsert({
    where: { slug: 'pro' },
    update: {},
    create: {
      slug: 'pro',
      name: 'Pro',
      messageLimit: 5000,
      maxSessions: 10,
      sendRateLimitMs: 2000,
      priceCents: 29900,
      isTrial: false,
      active: true,
    },
  });

  await prisma.redemptionCode.upsert({
    where: { code: 'WELCOME100' },
    update: {},
    create: {
      code: 'WELCOME100',
      messageBonus: 100,
      maxUses: 1000,
    },
  });

  console.log('Seeded plans and redemption codes');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
