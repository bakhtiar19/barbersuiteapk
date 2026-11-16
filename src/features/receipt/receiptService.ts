import { generateReceiptImage, type GeneratedReceiptImage } from '@/features/receipt/receiptImage';
import { formatDateTimeId, getWeeksSince } from '@/lib/date';
import { formatRupiah } from '@/lib/money';
import { normalizePhone } from '@/lib/phone';
import { openExternalUrl } from '@/platform/browser';
import { copyPlainText, saveFile, shareImageWithText } from '@/platform/files';
import type { AppSettings, PaymentMethod, TransactionWithItems } from '@/types/domain';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
};

function padLine(left: string, right: string, width = 32): string {
  const spaceCount = Math.max(1, width - left.length - right.length);
  return `${left}${' '.repeat(spaceCount)}${right}`;
}

export function buildReceiptText(trx: TransactionWithItems, settings: AppSettings): string {
  const lines: string[] = [];
  lines.push(`*${settings.shop_name || 'Barbershop'}*`);
  if (settings.shop_address?.trim()) {
    lines.push(settings.shop_address.trim());
  }
  if (settings.shop_phone?.trim()) {
    lines.push(settings.shop_phone.trim());
  }
  lines.push('--------------------------------');
  lines.push(`No    : ${trx.trx_number}`);
  lines.push(`Tgl   : ${formatDateTimeId(trx.created_at)}`);
  lines.push(`Plgn  : ${trx.customer_name}`);
  lines.push(`Barber: ${trx.barber_name}`);
  lines.push('--------------------------------');

  for (const item of trx.items) {
    const label = item.qty > 1 ? `${item.service_name} x${item.qty}` : item.service_name;
    lines.push(padLine(label, formatRupiah(item.line_total)));
  }

  lines.push('--------------------------------');
  lines.push(padLine('Subtotal', formatRupiah(trx.subtotal)));
  if (trx.discount_amount > 0) {
    lines.push(padLine('Diskon', `-${formatRupiah(trx.discount_amount)}`));
  }
  lines.push(`*${padLine('TOTAL', formatRupiah(trx.total))}*`);
  lines.push(`Bayar: ${PAYMENT_METHOD_LABELS[trx.payment_method] ?? trx.payment_method}`);

  if (trx.status === 'void') {
    lines.push(`STATUS: DIBATALKAN (${trx.void_reason || '-'})`);
  }

  lines.push('--------------------------------');
  lines.push(settings.receipt_footer || 'Terima kasih, sampai jumpa lagi! ✂️');

  return lines.join('\n');
}

export function buildAppreciationText(trx: TransactionWithItems, settings: AppSettings): string {
  const shopName = settings.shop_name || 'Barbershop kami';
  const footer = settings.receipt_footer || 'Terima kasih, sampai jumpa lagi! ✂️';
  const payment = PAYMENT_METHOD_LABELS[trx.payment_method] ?? trx.payment_method;

  return [
    `Terima kasih banyak sudah berkunjung ke *${shopName}*, ${trx.customer_name}! 🙏✂️`,
    '',
    'Kami sangat menghargai kepercayaan Anda. Terlampir gambar struk layanan Anda:',
    `• No. Struk: ${trx.trx_number}`,
    `• Tanggal: ${formatDateTimeId(trx.created_at)}`,
    `• Barber: ${trx.barber_name}`,
    `• Total: *${formatRupiah(trx.total)}* (${payment})`,
    '',
    footer,
  ].join('\n');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error('Nomor WhatsApp tidak valid.');
  }
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export interface SendReceiptResult {
  mode: 'wa-direct' | 'shared' | 'downloaded-and-copied';
  filename: string;
  sizeBytes: number;
}

export async function sendReceiptImageAndAppreciation(
  trx: TransactionWithItems,
  settings: AppSettings,
  pregeneratedImage?: GeneratedReceiptImage | null,
): Promise<SendReceiptResult> {
  const image = pregeneratedImage ?? (await generateReceiptImage(trx, settings));
  const appreciationText = buildAppreciationText(trx, settings);
  const normalizedPhone = normalizePhone(trx.customer_phone);

  const shareOutcome = await shareImageWithText({
    filename: image.filename,
    blob: image.blob,
    mimeType: image.mimeType,
    title: `Struk ${trx.trx_number} - ${settings.shop_name}`,
    text: appreciationText,
    phone: normalizedPhone,
  });

  if (shareOutcome === 'wa-direct-image') {
    return {
      mode: 'wa-direct',
      filename: image.filename,
      sizeBytes: image.sizeBytes,
    };
  }

  if (shareOutcome === 'native-shared' || shareOutcome === 'web-shared') {
    return {
      mode: 'shared',
      filename: image.filename,
      sizeBytes: image.sizeBytes,
    };
  }

  if (normalizedPhone) {
    const waUrl = buildWhatsAppUrl(normalizedPhone, appreciationText);
    await openExternalUrl(waUrl);
    return {
      mode: 'wa-direct',
      filename: image.filename,
      sizeBytes: image.sizeBytes,
    };
  }

  await copyPlainText(appreciationText);
  return {
    mode: 'downloaded-and-copied',
    filename: image.filename,
    sizeBytes: image.sizeBytes,
  };
}

export async function shareReceiptImageFile(
  trx: TransactionWithItems,
  settings: AppSettings,
  pregeneratedImage?: GeneratedReceiptImage | null,
): Promise<GeneratedReceiptImage> {
  const image = pregeneratedImage ?? (await generateReceiptImage(trx, settings));
  const appreciationText = buildAppreciationText(trx, settings);
  await shareImageWithText({
    filename: image.filename,
    blob: image.blob,
    mimeType: image.mimeType,
    title: `Struk ${trx.trx_number} - ${settings.shop_name}`,
    text: appreciationText,
  });
  return image;
}

export async function downloadReceiptImage(
  trx: TransactionWithItems,
  settings: AppSettings,
  pregeneratedImage?: GeneratedReceiptImage | null,
): Promise<GeneratedReceiptImage> {
  const image = pregeneratedImage ?? (await generateReceiptImage(trx, settings));
  await saveFile({
    filename: image.filename,
    content: image.blob,
    mimeType: image.mimeType,
    shareAfterSave: false,
  });
  return image;
}

export async function copyAppreciationText(
  trx: TransactionWithItems,
  settings: AppSettings,
  ): Promise<void> {
  const text = buildAppreciationText(trx, settings);
  await copyPlainText(text);
}

export function buildFollowUpMessage(
  template: string,
  customerName: string,
  lastVisitIso: string | null,
  shopName: string,
): string {
  const weeks = getWeeksSince(lastVisitIso);
  const weekText = weeks > 0 ? String(weeks) : 'beberapa';
  return (
    template ||
    'Halo {nama}, sudah {minggu} minggu sejak kunjungan terakhir. Yuk potong lagi di {toko}!'
  )
    .replace(/\{nama\}/gi, customerName)
    .replace(/\{minggu\}/gi, weekText)
    .replace(/\{n\}/gi, weekText)
    .replace(/\{toko\}/gi, shopName || 'barbershop kami');
}
