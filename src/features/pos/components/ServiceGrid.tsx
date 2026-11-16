import { Minus, Star } from 'lucide-react';
import type { ServiceWithUsage } from '@/db/repositories/serviceRepo';
import { formatRupiah } from '@/lib/money';

export function ServiceGrid({
  services,
  serviceQty,
  topIds,
  onAdd,
  onRemove,
}: {
  services: ServiceWithUsage[];
  serviceQty: Record<string, number>;
  topIds: Set<string>;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {services.map((svc) => {
        const qty = serviceQty[svc.id] ?? 0;
        const selected = qty > 0;
        return (
          <div
            key={svc.id}
            className={`relative rounded-2xl border transition ${
              selected
                ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <button
              type="button"
              aria-label={`Tambah ${svc.name}`}
              onClick={() => onAdd(svc.id)}
              className="flex h-full min-h-[88px] w-full select-none flex-col justify-between rounded-2xl p-3 text-left transition active:scale-[0.97]"
            >
              <span className="line-clamp-2 pr-7 text-sm font-semibold leading-snug text-brand-900">
                {svc.name}
              </span>
              <span className="mt-2 flex items-center gap-1.5">
                <span className="tabular-nums text-sm font-bold text-brand-700">
                  {formatRupiah(svc.price)}
                </span>
                {!selected && svc.duration_minutes && (
                  <span className="text-[11px] text-muted">· {svc.duration_minutes}m</span>
                )}
              </span>
            </button>

            {!selected && topIds.has(svc.id) && (
              <Star
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 fill-amber-400 text-amber-400"
              />
            )}

            {selected && (
              <>
                <span className="pointer-events-none absolute right-2 top-2 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-brand-900 px-1.5 text-xs font-bold text-white">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label={`Kurangi ${svc.name}`}
                  onClick={() => onRemove(svc.id)}
                  className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-900 transition hover:bg-brand-100 active:scale-90"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

