import { useState } from 'react';
import { ChevronDown, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CustomerCombobox } from '@/features/pos/components/CustomerCombobox';
import { DiscountInput, PaymentMethodSelector } from '@/features/pos/components/PosInputs';
import type { ServiceWithUsage } from '@/db/repositories/serviceRepo';
import { formatRupiah } from '@/lib/money';
import { formatPhoneDisplay } from '@/lib/phone';
import { useCartStore } from '@/stores/cartStore';

export interface CartLine {
  service: ServiceWithUsage;
  qty: number;
}

interface CartPanelProps {
  lines: CartLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
  fieldErrors: Record<string, string>;
  saving: boolean;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onSubmit: () => void;
}

export function CartPanel({
  lines,
  subtotal,
  discountAmount,
  total,
  fieldErrors,
  saving,
  onAdd,
  onRemove,
  onSubmit,
}: CartPanelProps) {
  const {
    customerId,
    customerName,
    customerPhone,
    discountType,
    discountValueInput,
    paymentMethod,
    notes,
    setCustomer,
    setCustomerName,
    setCustomerPhone,
    setDiscountType,
    setDiscountValueInput,
    setPaymentMethod,
    setNotes,
    setServiceQty,
  } = useCartStore();

  const [showExtras, setShowExtras] = useState(
    Boolean(discountValueInput || notes || fieldErrors.discount),
  );
  const itemCount = lines.reduce((acc, l) => acc + l.qty, 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      {/* Cart items */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-900">
            Pesanan · {itemCount} item
          </h3>
        </div>
        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-6 text-center">
            <ShoppingBag className="h-5 w-5 text-stone-400" />
            <p className="text-xs text-muted">Ketuk layanan untuk menambahkan</p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {lines.map(({ service, qty }) => (
              <li key={service.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{service.name}</p>
                  <p className="tabular-nums text-xs text-muted">
                    {formatRupiah(service.price)}
                    {qty > 1 ? ` × ${qty}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={qty > 1 ? `Kurangi ${service.name}` : `Hapus ${service.name}`}
                    onClick={() => (qty > 1 ? onRemove(service.id) : setServiceQty(service.id, 0))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-stone-100 hover:text-ink"
                  >
                    {qty > 1 ? <Minus className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                  <span className="tabular-nums w-5 text-center text-sm font-bold text-brand-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label={`Tambah lagi ${service.name}`}
                    onClick={() => onAdd(service.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-stone-100 hover:text-ink"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="tabular-nums w-[84px] shrink-0 text-right text-sm font-semibold text-brand-900">
                  {formatRupiah(service.price * qty)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {fieldErrors.services && (
          <p className="text-xs font-medium text-danger">{fieldErrors.services}</p>
        )}
      </section>

      {/* Customer */}
      <section className="space-y-2.5">
        <CustomerCombobox
          customerName={customerName}
          customerId={customerId}
          onNameChange={setCustomerName}
          onSelectCustomer={(c) =>
            setCustomer(c.id, c.name, c.phone ? formatPhoneDisplay(c.phone) : '')
          }
          error={fieldErrors.customerName}
        />
        <div className="space-y-1.5">
          <label htmlFor="pos-customer-phone" className="block text-xs font-semibold text-muted">
            Nomor WhatsApp <span className="font-normal">(opsional)</span>
          </label>
          <input
            id="pos-customer-phone"
            type="tel"
            inputMode="tel"
            placeholder="081234567890"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className={`min-h-[42px] w-full rounded-xl border bg-white px-3 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 ${
              fieldErrors.customerPhone
                ? 'border-danger focus:ring-danger/20'
                : 'border-stone-300 focus:border-brand-600 focus:ring-brand-600/20'
            }`}
          />
          {fieldErrors.customerPhone && (
            <p className="text-xs font-medium text-danger">{fieldErrors.customerPhone}</p>
          )}
        </div>
      </section>

      <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

      {/* Discount & notes (collapsed by default to keep checkout minimal) */}
      <section>
        <button
          type="button"
          onClick={() => setShowExtras((v) => !v)}
          className="flex w-full items-center justify-between py-1 text-xs font-semibold text-brand-700"
          aria-expanded={showExtras}
        >
          <span>Diskon & catatan</span>
          <ChevronDown className={`h-4 w-4 transition ${showExtras ? 'rotate-180' : ''}`} />
        </button>
        {showExtras && (
          <div className="mt-2 space-y-3">
            <DiscountInput
              discountType={discountType}
              discountValueInput={discountValueInput}
              onTypeChange={setDiscountType}
              onValueChange={setDiscountValueInput}
              error={fieldErrors.discount}
            />
            <div className="space-y-1.5">
              <label htmlFor="pos-notes" className="block text-xs font-semibold text-muted">
                Catatan
              </label>
              <input
                id="pos-notes"
                type="text"
                placeholder="Mis. fade tipis, pakai pomade"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-ink placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </div>
          </div>
        )}
      </section>

      {/* Totals */}
      <section className="space-y-1 border-t border-dashed border-stone-300 pt-3 text-sm">
        <div className="flex justify-between text-muted">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatRupiah(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-danger">
            <span>Diskon</span>
            <span className="tabular-nums">-{formatRupiah(discountAmount)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-sm font-bold text-brand-900">Total</span>
          <span className="tabular-nums text-2xl font-extrabold text-brand-900">
            {formatRupiah(total)}
          </span>
        </div>
      </section>

      <Button type="submit" fullWidth size="lg" loading={saving} disabled={lines.length === 0}>
        SIMPAN TRANSAKSI
      </Button>
    </form>
  );
}

