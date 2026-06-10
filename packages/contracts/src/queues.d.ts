export declare const QUEUES: {
    readonly SEND_MESSAGE: "send-message";
    readonly SESSION_INIT: "session-init";
    readonly SESSION_DISCONNECT: "session-disconnect";
    readonly CAMPAIGN_RUN: "campaign-run";
    readonly WEBHOOK_DELIVER: "webhook-deliver";
};
export declare const REDIS_CHANNELS: {
    readonly sessionEvent: (sessionId: string) => string;
    readonly workspaceEvent: (workspaceId: string) => string;
};
