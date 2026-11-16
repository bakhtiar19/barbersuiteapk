import { Link } from 'react-router-dom';
import { PAYMENT_METHOD_LABELS } from '@/features/receipt/receiptService';
import { formatDateTimeId } from '@/lib/date';
import { formatRupiah } from '@/lib/money';
import type { TransactionWithItems } from '@/types/domain';

export function TransactionListItem({ trx }: { trx: TransactionWithItems }) {
  const isVoid = trx.status === 'void';
  const services =
    trx.items.length > 0
      ? trx.items.map((it) => `${it.service_name}${it.qty > 1 ? ` ×${it.qty}` : ''}`).join(', ')
      : '-';
  const initial = trx.customer_name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Link
      to={`/transactions/${trx.id}`}
      className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-3.5 py-3 transition hover:border-brand-300 active:bg-stone-50"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          isVoid ? 'bg-red-50 text-danger' : 'bg-brand-900 text-amber-400'
        }`}
      >
        {initial}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-brand-900">{trx.customer_name}</p>
          {isVoid && (
            <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-danger">
              VOID
            </span>
          )}
        </div>
        <p className="truncate text-xs text-ink/80">{services}</p>
        <p className="truncate text-[11px] text-muted">
          {trx.barber_name} · {PAYMENT_METHOD_LABELS[trx.payment_method] ?? trx.payment_method} ·{' '}
          {formatDateTimeId(trx.created_at)}
        </p>
      </div>

      <span
        className={`tabular-nums shrink-0 text-sm font-bold ${
          isVoid ? 'text-muted line-through' : 'text-brand-900'
        }`}
      >
        {formatRupiah(trx.total)}
      </span>
    </Link>
  );
}
