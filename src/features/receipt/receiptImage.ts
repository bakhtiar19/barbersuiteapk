import { formatDateTimeId } from '@/lib/date';
import { formatRupiah } from '@/lib/money';
import type { AppSettings, PaymentMethod, TransactionWithItems } from '@/types/domain';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
};

export interface GeneratedReceiptImage {
  blob: Blob;
  dataUrl: string;
  filename: string;
  mimeType: 'image/png' | 'image/jpeg';
  sizeBytes: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return [];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function drawDashedDivider(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  ctx.save();
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/jpeg',
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Gagal membuat file gambar struk.'));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca gambar struk.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

/**
 * Render a clean, simple printed-paper-style digital receipt in HD (2x Retina)
 * with no extra decorations and no app branding/version.
 */
export async function generateReceiptImage(
  trx: TransactionWithItems,
  settings: AppSettings,
): Promise<GeneratedReceiptImage> {
  const scale = 2; // 2x Retina for crisp HD text
  const logicalWidth = 380;
  const padX = 28;
  const contentW = logicalWidth - padX * 2;
  const centerX = logicalWidth / 2;

  const fontMono =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = logicalWidth;
  measureCanvas.height = 100;
  const mctx = measureCanvas.getContext('2d');
  if (!mctx) {
    throw new Error('Browser tidak mendukung Canvas 2D untuk membuat gambar struk.');
  }

  const logoImg = settings.shop_logo ? await loadImage(settings.shop_logo) : null;

  // 1. Pre-measure text lines
  mctx.font = `700 18px ${fontMono}`;
  const shopNameText = (settings.shop_name || 'Barbershop').trim();
  const shopNameLines = wrapTextLines(mctx, shopNameText, contentW);

  mctx.font = `400 12px ${fontMono}`;
  const addressLines = settings.shop_address?.trim()
    ? wrapTextLines(mctx, settings.shop_address.trim(), contentW)
    : [];
  const phoneLines = settings.shop_phone?.trim()
    ? wrapTextLines(mctx, settings.shop_phone.trim(), contentW)
    : [];

  mctx.font = `500 13px ${fontMono}`;
  const itemLayouts = trx.items.map((item) => {
    const priceText = formatRupiah(item.line_total);
    const priceW = mctx.measureText(priceText).width + 14;
    const label = item.qty > 1 ? `${item.service_name} x${item.qty}` : item.service_name;
    const nameLines = wrapTextLines(mctx, label, Math.max(120, contentW - priceW));
    const unitNote =
      item.qty > 1 ? `${item.qty} x ${formatRupiah(item.unit_price)}` : null;
    return { nameLines, unitNote, priceText };
  });

  mctx.font = `400 12px ${fontMono}`;
  const notesLines = trx.notes?.trim()
    ? wrapTextLines(mctx, `Catatan: ${trx.notes.trim()}`, contentW)
    : [];

  const footerText = (settings.receipt_footer || 'Terima kasih, sampai jumpa lagi!').trim();
  const footerLines = wrapTextLines(mctx, footerText, contentW);

  // 2. Calculate total logical height
  let y = 28;
  if (logoImg) y += 54;
  y += shopNameLines.length * 23;
  if (addressLines.length > 0) y += 4 + addressLines.length * 17;
  if (phoneLines.length > 0) y += 2 + phoneLines.length * 17;
  if (trx.status === 'void') y += 24;

  y += 16 + 14; // dashed line
  y += 4 * 20; // 4 metadata rows
  y += 12 + 14; // dashed line

  for (const item of itemLayouts) {
    y += item.nameLines.length * 18;
    if (item.unitNote) y += 15;
    y += 8;
  }

  y += 8 + 14; // dashed line

  if (trx.discount_amount > 0) {
    y += 20; // Subtotal
    y += 20; // Diskon
    y += 4;
  }

  y += 24; // TOTAL
  y += 20; // Metode Bayar

  if (notesLines.length > 0) {
    y += 8 + notesLines.length * 17;
  }

  y += 14 + 14; // dashed line
  y += footerLines.length * 18;
  y += 28; // bottom padding

  const logicalHeight = y;

  // 3. Draw on 2x HD Canvas
  const canvas = document.createElement('canvas');
  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal membuat kanvas struk.');
  }

  ctx.scale(scale, scale);

  // Plain paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  let cy = 28;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  // Optional shop logo
  if (logoImg) {
    const maxLogo = 44;
    const ratio = Math.min(1, maxLogo / Math.max(logoImg.width, logoImg.height));
    const lw = Math.round(logoImg.width * ratio);
    const lh = Math.round(logoImg.height * ratio);
    ctx.drawImage(logoImg, centerX - lw / 2, cy, lw, lh);
    cy += 54;
  }

  // Shop Name
  ctx.fillStyle = '#111827';
  ctx.font = `700 18px ${fontMono}`;
  for (const line of shopNameLines) {
    ctx.fillText(line, centerX, cy);
    cy += 23;
  }

  // Address & Phone
  ctx.fillStyle = '#4B5563';
  ctx.font = `400 12px ${fontMono}`;
  if (addressLines.length > 0) {
    cy += 4;
    for (const line of addressLines) {
      ctx.fillText(line, centerX, cy);
      cy += 17;
    }
  }
  if (phoneLines.length > 0) {
    cy += 2;
    for (const line of phoneLines) {
      ctx.fillText(line, centerX, cy);
      cy += 17;
    }
  }

  if (trx.status === 'void') {
    cy += 6;
    ctx.fillStyle = '#DC2626';
    ctx.font = `700 12px ${fontMono}`;
    ctx.fillText('*** DIBATALKAN / VOID ***', centerX, cy);
    cy += 18;
  }

  cy += 16;
  drawDashedDivider(ctx, padX, logicalWidth - padX, cy);
  cy += 14;

  // Metadata rows
  const metaRows: Array<[string, string]> = [
    ['No', trx.trx_number],
    ['Tgl', formatDateTimeId(trx.created_at)],
    ['Plgn', trx.customer_name],
    ['Barber', trx.barber_name],
  ];

  for (const [label, val] of metaRows) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4B5563';
    ctx.font = `400 12.5px ${fontMono}`;
    ctx.fillText(label, padX, cy);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#111827';
    ctx.font = `500 12.5px ${fontMono}`;
    ctx.fillText(val, logicalWidth - padX, cy);
    cy += 20;
  }

  cy += 12;
  drawDashedDivider(ctx, padX, logicalWidth - padX, cy);
  cy += 14;

  // Items
  for (const item of itemLayouts) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111827';
    ctx.font = `500 13px ${fontMono}`;

    let itemY = cy;
    for (const line of item.nameLines) {
      ctx.fillText(line, padX, itemY);
      itemY += 18;
    }

    if (item.unitNote) {
      ctx.fillStyle = '#6B7280';
      ctx.font = `400 11.5px ${fontMono}`;
      ctx.fillText(item.unitNote, padX, itemY);
      itemY += 15;
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#111827';
    ctx.font = `500 13px ${fontMono}`;
    ctx.fillText(item.priceText, logicalWidth - padX, cy);

    cy = itemY + 8;
  }

  cy += 8;
  drawDashedDivider(ctx, padX, logicalWidth - padX, cy);
  cy += 14;

  // Subtotal & Discount (only if discount exists)
  if (trx.discount_amount > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4B5563';
    ctx.font = `400 12.5px ${fontMono}`;
    ctx.fillText('Subtotal', padX, cy);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#111827';
    ctx.fillText(formatRupiah(trx.subtotal), logicalWidth - padX, cy);
    cy += 20;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#4B5563';
    ctx.fillText('Diskon', padX, cy);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#111827';
    ctx.fillText(`-${formatRupiah(trx.discount_amount)}`, logicalWidth - padX, cy);
    cy += 24;
  }

  // TOTAL
  ctx.textAlign = 'left';
  ctx.fillStyle = '#111827';
  ctx.font = `700 15px ${fontMono}`;
  ctx.fillText('TOTAL', padX, cy);

  ctx.textAlign = 'right';
  ctx.font = `700 15px ${fontMono}`;
  ctx.fillText(formatRupiah(trx.total), logicalWidth - padX, cy);
  cy += 24;

  // Payment method
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4B5563';
  ctx.font = `400 12.5px ${fontMono}`;
  ctx.fillText('Bayar', padX, cy);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#111827';
  ctx.font = `500 12.5px ${fontMono}`;
  ctx.fillText(PAYMENT_LABELS[trx.payment_method] ?? trx.payment_method, logicalWidth - padX, cy);
  cy += 20;

  // Notes
  if (notesLines.length > 0) {
    cy += 8;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4B5563';
    ctx.font = `400 12px ${fontMono}`;
    for (const line of notesLines) {
      ctx.fillText(line, padX, cy);
      cy += 17;
    }
  }

  cy += 14;
  drawDashedDivider(ctx, padX, logicalWidth - padX, cy);
  cy += 14;

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#374151';
  ctx.font = `400 12px ${fontMono}`;
  for (const line of footerLines) {
    ctx.fillText(line, centerX, cy);
    cy += 18;
  }

  // Encode as crisp, lightweight JPEG
  let mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg';
  let blob = await canvasToBlob(canvas, 'image/jpeg', 0.85);
  if (blob.type === 'image/jpeg' && blob.size > 60 * 1024) {
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.76);
  }
  if (blob.type !== 'image/jpeg') {
    mimeType = 'image/png';
    blob = await canvasToBlob(canvas, 'image/png');
  }

  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const dataUrl = await blobToDataUrl(blob);

  return {
    blob,
    dataUrl,
    filename: `struk-${trx.trx_number}.${ext}`,
    mimeType,
    sizeBytes: blob.size,
    width: canvas.width,
    height: canvas.height,
  };
}
