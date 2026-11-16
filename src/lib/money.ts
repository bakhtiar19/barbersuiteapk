import type { DiscountType } from '@/types/domain';

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount || 0);
  const absFormatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(Math.abs(rounded));

  if (rounded < 0) {
    return `-Rp ${absFormatted}`;
  }
  return `Rp ${absFormatted}`;
}

export function formatCompactRupiah(amount: number): string {
  const rounded = Math.round(amount || 0);
  if (Math.abs(rounded) >= 1_000_000) {
    const val = (rounded / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `Rp ${val}jt`;
  }
  if (Math.abs(rounded) >= 1_000) {
    const val = Math.round(rounded / 1_000);
    return `Rp ${val}rb`;
  }
  return formatRupiah(rounded);
}

export function parseDigitsToInt(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

export function calculateDiscountAmount(
  subtotal: number,
  discountType: DiscountType | null,
  discountValue: number,
): number {
  if (!discountType || discountValue <= 0 || subtotal <= 0) {
    return 0;
  }

  if (discountType === 'percent') {
    const cappedPct = Math.min(100, Math.max(0, discountValue));
    const computed = Math.round((subtotal * cappedPct) / 100);
    return Math.min(subtotal, computed);
  }

  return Math.min(subtotal, Math.max(0, Math.round(discountValue)));
}

