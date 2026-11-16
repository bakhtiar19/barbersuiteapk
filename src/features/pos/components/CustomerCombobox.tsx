import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { searchCustomers } from '@/db/repositories/customerRepo';
import { formatPhoneDisplay } from '@/lib/phone';
import type { Customer } from '@/types/domain';

interface CustomerComboboxProps {
  customerName: string;
  customerId: string | null;
  onNameChange: (name: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  error?: string;
}

export function CustomerCombobox({
  customerName,
  customerId,
  onNameChange,
  onSelectCustomer,
  error,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);

  useEffect(() => {
    let active = true;
    void searchCustomers(customerName, 6).then((rows) => {
      if (active) setSuggestions(rows);
    });
    return () => {
      active = false;
    };
  }, [customerName]);

  const trimmed = customerName.trim();
  const hasExactMatch = suggestions.some(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
  );

  return (
    <div className="relative space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor="pos-customer-name" className="block text-xs font-semibold text-muted">
          Nama Pelanggan *
        </label>
        {customerId && (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-success">
            Pelanggan lama
          </span>
        )}
      </div>

      <input
        id="pos-customer-name"
        type="text"
        value={customerName}
        placeholder="Cari / ketik nama pelanggan"
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 180);
        }}
        onChange={(e) => {
          onNameChange(e.target.value);
          setOpen(true);
        }}
        className={`min-h-[42px] w-full rounded-xl border bg-white px-3 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 ${
          error
            ? 'border-danger focus:border-danger focus:ring-danger/20'
            : 'border-stone-300 focus:border-brand-600 focus:ring-brand-600/20'
        }`}
      />
      {error && <p className="text-xs font-medium text-danger">{error}</p>}

      {open && (suggestions.length > 0 || (trimmed.length > 0 && !hasExactMatch)) && (
        <div className="absolute left-0 right-0 top-[68px] z-30 max-h-60 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xl">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelectCustomer(c);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-brand-50"
            >
              <span className="font-semibold text-brand-900">{c.name}</span>
              <span className="text-xs text-muted">{formatPhoneDisplay(c.phone)}</span>
            </button>
          ))}

          {trimmed.length > 0 && !hasExactMatch && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-xl border-t border-stone-100 px-3 py-2.5 text-left text-xs font-semibold text-brand-700 hover:bg-brand-50"
            >
              <UserPlus className="h-4 w-4" />
              <span>Buat pelanggan baru: &ldquo;{trimmed}&rdquo;</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

