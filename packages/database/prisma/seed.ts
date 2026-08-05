import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * EGP pricing (priceCents = EGP × 100).
 * Costed from Hostinger VPS session capacity vs Ultramsg / Whapi / Wasender.
 * See canvases/whatsapp-otp-pricing-egp.canvas.tsx for the full model.
 */
const plans = [
  {
    slug: 'trial',
    name: 'Trial',
    messageLimit: 30,
    maxSessions: 1,
    sendRateLimitMs: 3000,
    priceCents: 0,
    isTrial: true,
  },
  {
    slug: 'starter',
    name: 'Starter',
    messageLimit: 1000,
    maxSessions: 1,
    sendRateLimitMs: 2500,
    priceCents: 14900,
    isTrial: false,
  },
  {
    slug: 'growth',
    name: 'Growth',
    messageLimit: 10_000,
    maxSessions: 3,
    sendRateLimitMs: 2000,
    priceCents: 39900,
    isTrial: false,
  },
  {
    slug: 'unlimited-otp',
    name: 'Unlimited OTP',
    messageLimit: 1_000_000,
    maxSessions: 1,
    sendRateLimitMs: 2000,
    priceCents: 44900,
    isTrial: false,
  },
  {
    slug: 'agency',
    name: 'Agency',
    messageLimit: 1_000_000,
    maxSessions: 3,
    sendRateLimitMs: 1500,
    priceCents: 119900,
    isTrial: false,
  },
  {
    slug: 'scale',
    name: 'Scale',
    messageLimit: 1_000_000,
    maxSessions: 10,
    sendRateLimitMs: 1500,
    priceCents: 299900,
    isTrial: false,
  },
] as const;

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        messageLimit: plan.messageLimit,
        maxSessions: plan.maxSessions,
        sendRateLimitMs: plan.sendRateLimitMs,
        priceCents: plan.priceCents,
        isTrial: plan.isTrial,
        active: true,
      },
      create: { ...plan, active: true },
    });
  }

  // Retire legacy "pro" slug if present (replaced by Growth + Unlimited OTP)
  await prisma.plan.updateMany({
    where: { slug: 'pro' },
    data: { active: false },
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
