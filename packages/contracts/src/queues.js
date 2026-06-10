"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDIS_CHANNELS = exports.QUEUES = void 0;
exports.QUEUES = {
    SEND_MESSAGE: 'send-message',
    SESSION_INIT: 'session-init',
    SESSION_DISCONNECT: 'session-disconnect',
    CAMPAIGN_RUN: 'campaign-run',
    WEBHOOK_DELIVER: 'webhook-deliver',
};
exports.REDIS_CHANNELS = {
    sessionEvent: (sessionId) => `session:${sessionId}:events`,
    workspaceEvent: (workspaceId) => `workspace:${workspaceId}:events`,
};
//# sourceMappingURL=queues.js.map