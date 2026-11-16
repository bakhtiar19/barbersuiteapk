import { describe, expect, it } from 'vitest';
import {
  buildAppreciationText,
  buildFollowUpMessage,
  buildReceiptText,
  buildWhatsAppUrl,
} from '@/features/receipt/receiptService';
import { hashPin, pbkdf2Sha256Fallback, sha256BytesFallback, sha256Hex } from '@/lib/crypto';
import { formatTrxNumber } from '@/lib/id';
import { calculateDiscountAmount, formatRupiah } from '@/lib/money';
import { formatPhoneDisplay, normalizePhone } from '@/lib/phone';
import { DEFAULT_SETTINGS } from '@/stores/settingsStore';
import type { TransactionWithItems } from '@/types/domain';

describe('money helpers', () => {
  it('formats Rupiah cleanly without decimals', () => {
    expect(formatRupiah(50000)).toBe('Rp 50.000');
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000');
    expect(formatRupiah(-5000)).toBe('-Rp 5.000');
  });

  it('calculates nominal and percentage discounts bounded by subtotal', () => {
    expect(calculateDiscountAmount(70000, 'amount', 5000)).toBe(5000);
    expect(calculateDiscountAmount(70000, 'amount', 100000)).toBe(70000);
    expect(calculateDiscountAmount(80000, 'percent', 25)).toBe(20000);
    expect(calculateDiscountAmount(80000, 'percent', 150)).toBe(80000);
  });
});

describe('phone helpers', () => {
  it('normalizes Indonesian numbers to 62xxx', () => {
    expect(normalizePhone('0812-3456-7890')).toBe('6281234567890');
    expect(normalizePhone('+62 812 3456 7890')).toBe('6281234567890');
    expect(normalizePhone('6281234567890')).toBe('6281234567890');
    expect(normalizePhone('81234567890')).toBe('6281234567890');
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('123')).toBeNull();
  });

  it('formats 62xxx back to local display 08xxx', () => {
    expect(formatPhoneDisplay('6281234567890')).toBe('081234567890');
  });
});

describe('id & receipt helpers', () => {
  it('formats transaction number as TRX-YYYYMMDD-NNNN', () => {
    expect(formatTrxNumber('2026-11-10', 19)).toBe('TRX-20261110-0019');
  });

  it('builds formatted receipt text and WhatsApp URL', () => {
    const trx: TransactionWithItems = {
      id: 't1',
      trx_number: 'TRX-20261110-0019',
      trx_date: '2026-11-10',
      created_at: '2026-11-10T07:32:00.000Z',
      customer_id: 'c1',
      customer_name: 'Andi',
      customer_phone: '6281234567890',
      barber_id: 'b1',
      barber_name: 'Dimas',
      subtotal: 70000,
      discount_type: 'amount',
      discount_value: 5000,
      discount_amount: 5000,
      total: 65000,
      payment_method: 'cash',
      notes: null,
      status: 'completed',
      void_reason: null,
      voided_at: null,
      items: [
        {
          id: 'i1',
          transaction_id: 't1',
          service_id: 's1',
          service_name: 'Haircut',
          unit_price: 50000,
          qty: 1,
          line_total: 50000,
        },
        {
          id: 'i2',
          transaction_id: 't1',
          service_id: 's2',
          service_name: 'Cuci rambut',
          unit_price: 20000,
          qty: 1,
          line_total: 20000,
        },
      ],
    };

    const receipt = buildReceiptText(trx, { ...DEFAULT_SETTINGS, shop_name: 'Barbershop Rapi' });
    expect(receipt).toContain('*Barbershop Rapi*');
    expect(receipt).toContain('TRX-20261110-0019');
    expect(receipt).toContain('Haircut');
    expect(receipt).toContain('Rp 65.000');
    expect(receipt).toContain('Bayar: Tunai');

    const waUrl = buildWhatsAppUrl('081234567890', receipt);
    expect(waUrl.startsWith('https://wa.me/6281234567890?text=')).toBe(true);

    const appreciation = buildAppreciationText(trx, {
      ...DEFAULT_SETTINGS,
      shop_name: 'Barbershop Rapi',
    });
    expect(appreciation).toContain('Terima kasih banyak sudah berkunjung ke *Barbershop Rapi*, Andi!');
    expect(appreciation).toContain('TRX-20261110-0019');
    expect(appreciation).toContain('Rp 65.000');
  });

  it('interpolates follow-up template placeholders', () => {
    const msg = buildFollowUpMessage(
      'Halo {nama}, sudah {minggu} minggu tidak potong di {toko}!',
      'Budi',
      new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      'Rapi Cut',
    );
    expect(msg).toBe('Halo Budi, sudah 3 minggu tidak potong di Rapi Cut!');
  });
});

describe('crypto HTTP fallback parity', () => {
  it('matches Web Crypto SHA-256 and PBKDF2-SHA256 output identically', async () => {
    const sample = '{"hello":"barbershop-bms"}';
    const webCryptoHex = await sha256Hex(sample);
    const fallbackBytes = sha256BytesFallback(new TextEncoder().encode(sample));
    const fallbackHex = Array.from(fallbackBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(fallbackHex).toBe(webCryptoHex);

    const { hash, salt } = await hashPin('1234', '00112233445566778899aabbccddeeff');
    const saltBytes = new Uint8Array(
      salt.match(/.{1,2}/g)!.map((b) => Number.parseInt(b, 16)),
    );
    const pbkdf2Bytes = pbkdf2Sha256Fallback(new TextEncoder().encode('1234'), saltBytes, 100_000);
    const pbkdf2Hex = Array.from(pbkdf2Bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(pbkdf2Hex).toBe(hash);
  });
});

