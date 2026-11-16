import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { generateReceiptImage, type GeneratedReceiptImage } from '@/features/receipt/receiptImage';
import { PAYMENT_METHOD_LABELS } from '@/features/receipt/receiptService';
import { formatDateTimeId } from '@/lib/date';
import { formatRupiah } from '@/lib/money';
import type { AppSettings, TransactionWithItems } from '@/types/domain';

function formatFileSizeKb(bytes: number): string {
  const kb = bytes / 1024;
  return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
}

export function ReceiptPreview({
  trx,
  settings,
  onImageGenerated,
}: {
  trx: TransactionWithItems;
  settings: AppSettings;
  onImageGenerated?: (image: GeneratedReceiptImage | null) => void;
}) {
  const [image, setImage] = useState<GeneratedReceiptImage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    void generateReceiptImage(trx, settings)
      .then((res) => {
        if (!active) return;
        setImage(res);
        onImageGenerated?.(res);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        onImageGenerated?.(null);
      });
    return () => {
      active = false;
    };
  }, [trx, settings, onImageGenerated]);

  if (image && !failed) {
    return (
      <div className="mx-auto max-w-sm space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600">
            <Receipt className="h-3.5 w-3.5 text-stone-500" />
            Struk Digital
          </span>
          <Badge variant="neutral">
            HD · {image.mimeType === 'image/jpeg' ? 'JPG' : 'PNG'} ·{' '}
            {formatFileSizeKb(image.sizeBytes)}
          </Badge>
        </div>
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <img
            src={image.dataUrl}
            alt={`Struk ${trx.trx_number}`}
            className="block h-auto w-full select-none"
          />
        </div>
      </div>
    );
  }

  // Instant DOM fallback while canvas generates (or in non-canvas test environments)
  return (
    <Card className="mx-auto max-w-sm rounded-xl border border-stone-200 bg-white p-5 font-mono text-xs text-ink shadow-sm">
      <div className="space-y-0.5 text-center">
        {settings.shop_logo && (
          <img
            src={settings.shop_logo}
            alt={settings.shop_name}
            className="mx-auto mb-2 h-11 w-11 object-contain"
          />
        )}
        <p className="text-sm font-bold text-brand-900">{settings.shop_name || 'Barbershop'}</p>
        {settings.shop_address && <p className="text-[11px] text-muted">{settings.shop_address}</p>}
        {settings.shop_phone && <p className="text-[11px] text-muted">{settings.shop_phone}</p>}
        {trx.status === 'void' && (
          <p className="pt-1 font-bold text-danger">*** DIBATALKAN / VOID ***</p>
        )}
      </div>

      <div className="my-3 border-t border-dashed border-stone-300" />

      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted">No</span>
          <span className="font-medium text-brand-900">{trx.trx_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Tgl</span>
          <span>{formatDateTimeId(trx.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Plgn</span>
          <span>{trx.customer_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Barber</span>
          <span>{trx.barber_name}</span>
        </div>
      </div>

      <div className="my-3 border-t border-dashed border-stone-300" />

      <div className="space-y-1.5">
        {trx.items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3">
            <div>
              <p>
                {item.service_name}
                {item.qty > 1 ? ` x${item.qty}` : ''}
              </p>
              {item.qty > 1 && (
                <p className="text-[10px] text-muted">
                  {item.qty} x {formatRupiah(item.unit_price)}
                </p>
              )}
            </div>
            <span className="tabular-nums shrink-0 font-medium">
              {formatRupiah(item.line_total)}
            </span>
          </div>
        ))}
      </div>

      <div className="my-3 border-t border-dashed border-stone-300" />

      <div className="space-y-1">
        {trx.discount_amount > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="tabular-nums">{formatRupiah(trx.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Diskon</span>
              <span className="tabular-nums">-{formatRupiah(trx.discount_amount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between pt-0.5 text-sm font-bold text-brand-900">
          <span>TOTAL</span>
          <span className="tabular-nums">{formatRupiah(trx.total)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted">Bayar</span>
          <span>{PAYMENT_METHOD_LABELS[trx.payment_method] ?? trx.payment_method}</span>
        </div>
      </div>

      {trx.notes && <p className="mt-2 text-[11px] text-muted">Catatan: {trx.notes}</p>}

      <div className="my-3 border-t border-dashed border-stone-300" />
      <p className="text-center text-[11px] text-muted">{settings.receipt_footer}</p>
    </Card>
  );
}
