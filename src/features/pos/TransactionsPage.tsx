import { useCallback, useEffect, useState } from 'react';
import { Plus, Receipt, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { listTransactions } from '@/db/repositories/transactionRepo';
import { TransactionListItem } from '@/features/dashboard/components/TransactionListItem';
import type { TransactionWithItems } from '@/types/domain';

const PAGE_SIZE = 50;

export function TransactionsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'completed' | 'void'>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TransactionWithItems[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listTransactions({ search, status, limit: PAGE_SIZE, offset: 0 });
      setItems(rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat transaksi.');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const more = await listTransactions({
        search,
        status,
        limit: PAGE_SIZE,
        offset: items.length,
      });
      setItems((prev) => [...prev, ...more]);
      setHasMore(more.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Riwayat Transaksi"
        backTo="/"
        rightSlot={
          <Button size="sm" onClick={() => navigate('/pos')} leftIcon={<Plus className="h-4 w-4" />}>
            Kasir
          </Button>
        }
      />

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-4">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted" />
            <input
              type="search"
              placeholder="Cari no. transaksi, pelanggan, barber..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
          </div>

          <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 text-xs font-semibold">
            {(
              [
                { value: 'all', label: 'Semua' },
                { value: 'completed', label: 'Selesai' },
                { value: 'void', label: 'Void' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`min-h-[36px] rounded-lg px-3 transition ${
                  status === opt.value
                    ? 'bg-brand-900 text-white'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <PageSkeleton />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon={<Receipt className="h-6 w-6" />}
            title="Tidak ada transaksi"
            description={
              search
                ? 'Tidak ditemukan transaksi yang sesuai dengan pencarian.'
                : 'Belum ada transaksi tercatat.'
            }
            action={
              <Button onClick={() => navigate('/pos')} leftIcon={<Plus className="h-4 w-4" />}>
                Transaksi Baru
              </Button>
            }
          />
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-2.5">
            {items.map((trx) => (
              <TransactionListItem key={trx.id} trx={trx} />
            ))}
            {hasMore && (
              <div className="pt-2 text-center">
                <Button variant="outline" loading={loadingMore} onClick={handleLoadMore}>
                  Muat Lebih Banyak
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

