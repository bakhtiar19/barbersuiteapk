import type { Barber, DiscountType, PaymentMethod } from '@/types/domain';

export function BarberChips({
  barbers,
  selectedBarberId,
  onSelect,
  error,
}: {
  barbers: Barber[];
  selectedBarberId: string;
  onSelect: (id: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Barber
        </span>
        {barbers.map((barber) => {
          const active = barber.id === selectedBarberId;
          return (
            <button
              key={barber.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(barber.id)}
              className={`flex min-h-[38px] shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-sm font-semibold transition active:scale-95 ${
                active
                  ? 'border-brand-900 bg-brand-900 text-white'
                  : 'border-stone-200 bg-white text-ink hover:border-stone-300'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  active ? 'bg-brand-600 text-white' : 'bg-stone-100 text-brand-900'
                }`}
              >
                {barber.name.charAt(0).toUpperCase()}
              </span>
              {barber.name}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function DiscountInput({
  discountType,
  discountValueInput,
  onTypeChange,
  onValueChange,
  error,
}: {
  discountType: DiscountType;
  discountValueInput: string;
  onTypeChange: (t: DiscountType) => void;
  onValueChange: (val: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="pos-discount" className="block text-xs font-semibold text-muted">
        Diskon
      </label>
      <div className="flex gap-2">
        <div className="inline-flex shrink-0 rounded-xl bg-stone-100 p-1">
          {(['amount', 'percent'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTypeChange(t)}
              className={`min-h-[34px] min-w-[38px] rounded-lg px-2.5 text-xs font-bold transition ${
                discountType === t ? 'bg-white text-brand-900 shadow-sm' : 'text-muted'
              }`}
            >
              {t === 'amount' ? 'Rp' : '%'}
            </button>
          ))}
        </div>
        <input
          id="pos-discount"
          type="text"
          inputMode="numeric"
          placeholder={discountType === 'percent' ? '0 – 100' : '0'}
          value={discountValueInput}
          onChange={(e) => onValueChange(e.target.value.replace(/\D/g, ''))}
          className={`tabular-nums min-h-[42px] min-w-0 flex-1 rounded-xl border bg-white px-3 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 ${
            error
              ? 'border-danger focus:ring-danger/20'
              : 'border-stone-300 focus:border-brand-600 focus:ring-brand-600/20'
          }`}
        />
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
];

export function PaymentMethodSelector({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold text-muted">Pembayaran</span>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
        {PAYMENT_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={`min-h-[38px] rounded-lg text-sm font-semibold transition ${
                active ? 'bg-brand-900 text-white shadow-sm' : 'text-ink hover:bg-white/70'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
