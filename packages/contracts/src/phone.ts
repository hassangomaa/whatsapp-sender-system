/** Strip non-digits — matches ttakka/egy-guests consumers. */
export function normalizePhone(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, '');
}

export function isValidPhone(phoneNumber: string): boolean {
  const digits = normalizePhone(phoneNumber);
  return digits.length >= 10 && digits.length <= 15;
}
