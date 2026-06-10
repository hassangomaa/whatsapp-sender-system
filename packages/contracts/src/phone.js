"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = normalizePhone;
exports.isValidPhone = isValidPhone;
function normalizePhone(phoneNumber) {
    return phoneNumber.replace(/\D/g, '');
}
function isValidPhone(phoneNumber) {
    const digits = normalizePhone(phoneNumber);
    return digits.length >= 10 && digits.length <= 15;
}
//# sourceMappingURL=phone.js.map