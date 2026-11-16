/**
 * Normalize Indonesian phone numbers to `62xxxxxxxxxx` format.
 * Returns null if input is empty or invalid.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith('8')) {
    digits = `62${digits}`;
  } else if (digits.startsWith('0062')) {
    digits = digits.slice(2);
  }

  if (!digits.startsWith('62') && digits.length >= 9 && digits.length <= 15) {
    // Allow international numbers if explicitly entered without leading 0
    return digits;
  }

  if (digits.length < 9 || digits.length > 15) {
    return null;
  }

  return digits;
}

export function isValidPhoneInput(raw: string): boolean {
  if (!raw.trim()) return true;
  return normalizePhone(raw) !== null;
}

export function formatPhoneDisplay(normalized: string | null | undefined): string {
  if (!normalized) return '-';
  if (normalized.startsWith('62')) {
    return `0${normalized.slice(2)}`;
  }
  return normalized;
}

