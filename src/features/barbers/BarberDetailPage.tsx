import { useCallback, useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { getBarberById, getBarberDetailStats } from '@/db/repositories/barberRepo';
import { listTransactions } from '@/db/repositories/transactionRepo';
import { TransactionListItem } from '@/features/dashboard/components/TransactionListItem';
import { getRangeForPreset } from '@/lib/date';
import { formatRupiah } from '@/lib/money';
import { formatPhoneDisplay } from '@/lib/phone';
import { useSettingsStore } from '@/stores/settingsStore';
import type { Barber, TransactionWithItems } from '@/types/domain';

type BarberPeriod = 'all' | 'daily' | 'weekly' | 'monthly';

export function BarberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const weekStart = useSettingsStore((s) => s.settings.week_start);

  const [period, setPeriod] = useState<BarberPeriod>('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [stats, setStats] = useState({ trxCount: 0, uniqueCustomers: 0, totalRevenue: 0 });
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const b = await getBarberById(id);
      if (!b) {
        setError('Barber tidak ditemukan.');
        return;
      }
      setBarber(b);

      const range = period === 'all' ? undefined : getRangeForPreset(period, weekStart);
      const [detailStats, trxs] = await Promise.all([
        getBarberDetailStats(id, range?.from, range?.to),
        listTransactions({ barberId: id, from: range?.from, to: range?.to, limit: 100 }),
      ]);
      setStats(detailStats);
      setTransactions(trxs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail barber.');
    } finally {
      setLoading(false);
    }
  }, [id, period, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <PageHeader
        title={barber ? barber.name : 'Detail Barber'}
        subtitle={barber?.phone ? formatPhoneDisplay(barber.phone) : 'Performa & Riwayat'}
        backTo="/barbers"
      />

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-stone-200 bg-white p-1">
          {(
            [
              { id: 'daily', label: 'Hari Ini' },
              { id: 'weekly', label: 'Minggu Ini' },
              { id: 'monthly', label: 'Bulan Ini' },
              { id: 'all', label: 'Semua' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id)}
              className={`min-h-[38px] rounded-xl text-xs font-semibold transition ${
                period === tab.id ? 'bg-brand-900 text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <PageSkeleton />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && barber && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <p className="text-xs text-muted">Pendapatan</p>
                <p className="tabular-nums mt-1 text-base font-bold text-brand-900 sm:text-xl">
                  {formatRupiah(stats.totalRevenue)}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-muted">Transaksi</p>
                <p className="tabular-nums mt-1 text-xl font-bold text-brand-900">
                  {stats.trxCount}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-muted">Pelanggan Unik</p>
                <p className="tabular-nums mt-1 text-xl font-bold text-brand-900">
                  {stats.uniqueCustomers}
                </p>
              </Card>
            </div>

            <section className="space-y-2.5">
              <h2 className="text-base font-bold text-brand-900">Riwayat Layanan</h2>
              {transactions.length === 0 ? (
                <EmptyState
                  icon={<Receipt className="h-6 w-6" />}
                  title="Belum ada transaksi"
                  description="Belum ada transaksi yang ditangani pada periode ini."
                />
              ) : (
                <div className="space-y-2.5">
                  {transactions.map((trx) => (
                    <TransactionListItem key={trx.id} trx={trx} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

