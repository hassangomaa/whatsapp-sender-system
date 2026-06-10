export { Prisma, PrismaClient, SessionStatus, MessageStatus, CampaignStatus, CampaignRecipientStatus, } from '@prisma/client';
export type { User, Workspace, WhatsappSession, Message, Plan, Subscription, UsageCounter, Campaign, CampaignRecipient, } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
