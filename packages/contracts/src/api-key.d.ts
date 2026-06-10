export declare function generateApiKey(): {
    key: string;
    prefix: string;
    hash: string;
};
export declare function hashApiKey(key: string): string;
export declare function generateReferralCode(): string;
