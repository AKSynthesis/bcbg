// Twilio requires E.164 format (+15555550123). This is a lightweight
// North-America-biased heuristic, NOT a full international phone
// validator -- good enough for a v1 where the target market is North
// American businesses, but worth swapping for a proper library
// (libphonenumber-js) if international customers become common.
export function normalizePhoneToE164(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    return digits.length >= 8 ? `+${digits}` : null;
  }
  if (digits.length === 10) {
    return `+1${digits}`; // assume North American number without country code
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return null; // couldn't confidently normalize
}