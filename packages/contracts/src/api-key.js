"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiKey = generateApiKey;
exports.hashApiKey = hashApiKey;
exports.generateReferralCode = generateReferralCode;
const crypto_1 = require("crypto");
function generateApiKey() {
    const raw = (0, crypto_1.randomBytes)(32).toString('hex');
    const key = `sk_live_${raw}`;
    const prefix = key.slice(0, 16);
    const hash = hashApiKey(key);
    return { key, prefix, hash };
}
function hashApiKey(key) {
    return (0, crypto_1.createHash)('sha256').update(key).digest('hex');
}
function generateReferralCode() {
    return `WA${(0, crypto_1.randomBytes)(4).toString('hex').toUpperCase()}`;
}
//# sourceMappingURL=api-key.js.map