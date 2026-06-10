"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.CampaignRecipientStatus = exports.CampaignStatus = exports.MessageStatus = exports.SessionStatus = exports.PrismaClient = exports.Prisma = void 0;
var client_1 = require("@prisma/client");
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_1.Prisma; } });
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
Object.defineProperty(exports, "SessionStatus", { enumerable: true, get: function () { return client_1.SessionStatus; } });
Object.defineProperty(exports, "MessageStatus", { enumerable: true, get: function () { return client_1.MessageStatus; } });
Object.defineProperty(exports, "CampaignStatus", { enumerable: true, get: function () { return client_1.CampaignStatus; } });
Object.defineProperty(exports, "CampaignRecipientStatus", { enumerable: true, get: function () { return client_1.CampaignRecipientStatus; } });
const client_2 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_2.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
//# sourceMappingURL=index.js.map