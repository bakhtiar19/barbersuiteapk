import { useCallback, useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Plus, Receipt, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  getDailyRevenueSeries,
  getDashboardStats,
  getMonthlyRevenueSeries,
} from '@/db/repositories/reportQueries';
import { listTransactions } from '@/db/repositories/transactionRepo';
import { AddToHomeScreenBanner } from '@/features/dashboard/components/AddToHomeScreenBanner';
import { BackupStatusBanner } from '@/features/dashboard/components/BackupStatusBanner';
import { RevenueChart } from '@/features/dashboard/components/RevenueChart';
import { TransactionListItem } from '@/features/dashboard/components/TransactionListItem';
import { formatDateId, getLocalDateString } from '@/lib/date';
import { formatRupiah } from '@/lib/money';
import { useSettingsStore } from '@/stores/settingsStore';
import type { DashboardStats, RevenueChartPoint, TransactionWithItems } from '@/types/domain';

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="tabular-nums mt-1 truncate text-base font-bold text-brand-900 sm:text-lg">
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-muted">{hint}</p>}
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const shopName = useSettingsStore((s) => s.settings.shop_name);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartMode, setChartMode] = useState<'daily' | 'monthly'>('daily');
  const [chartData, setChartData] = useState<RevenueChartPoint[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithItems[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, recent, series] = await Promise.all([
        getDashboardStats(),
        listTransactions({ limit: 5, offset: 0 }),
        chartMode === 'daily' ? getDailyRevenueSeries(30) : getMonthlyRevenueSeries(12),
      ]);
      setStats(s);
      setRecentTransactions(recent);
      setChartData(series);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat dashboard.');
    } finally {
      setLoading(false);
    }
  }, [chartMode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pctDiff =
    stats && stats.yesterdayRevenue > 0
      ? Math.round(((stats.todayRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue) * 100)
      : null;

  return (
    <AppShell>
      {/* Dark barbershop hero */}
      <header className="pt-safe bg-brand-900 text-white">
        <div className="barber-stripe h-1" />
        <div className="mx-auto max-w-5xl px-4 pb-6 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-stone-400">{formatDateId(getLocalDateString())}</p>
              <h1 className="font-display truncate text-xl font-bold">{shopName}</h1>
            </div>
            <Link
              to="/settings"
              aria-label="Pengaturan"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-300 hover:bg-white/10 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400">
              Omzet Hari Ini
            </p>
            {loading && !stats ? (
              <Skeleton className="mt-2 h-10 w-48 bg-white/10" />
            ) : (
              <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="tabular-nums text-4xl font-extrabold tracking-tight">
                  {formatRupiah(stats?.todayRevenue ?? 0)}
                </p>
                {pctDiff !== null && (
                  <span
                    className={`mb-1.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      pctDiff >= 0 ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
                    }`}
                  >
                    {pctDiff >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {Math.abs(pctDiff)}%
                  </span>
                )}
              </div>
            )}
            <p className="mt-1 text-xs text-stone-400">
              {stats?.todayTrxCount ?? 0} transaksi selesai hari ini
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] sm:w-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Transaksi Baru
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-4">
        <AddToHomeScreenBanner />
        <BackupStatusBanner />

        {!loading && error && <ErrorState message={error} onRetry={loadData} />}

        {loading && !stats && (
          <div className="grid grid-cols-3 gap-2.5">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        )}

        {!error && stats && (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <MiniStat
                label="Rata-rata"
                value={formatRupiah(stats.averageTransaction)}
                hint="per transaksi"
              />
              <MiniStat
                label="Pelanggan"
                value={String(stats.totalCustomers)}
                hint={stats.newCustomersToday > 0 ? `+${stats.newCustomersToday} hari ini` : 'total'}
              />
              <MiniStat
                label="Terlaris"
                value={stats.topServiceName ?? '—'}
                hint={stats.topServiceCount > 0 ? `${stats.topServiceCount}× bulan ini` : undefined}
              />
            </div>

            <RevenueChart
              title={chartMode === 'daily' ? 'Omzet 30 Hari' : 'Omzet 12 Bulan'}
              data={chartData}
              mode={chartMode}
              onModeChange={setChartMode}
            />

            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-900">
                  Transaksi Terakhir
                </h2>
                <Link
                  to="/transactions"
                  className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Semua
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {recentTransactions.length === 0 ? (
                <EmptyState
                  icon={<Receipt className="h-6 w-6" />}
                  title="Belum ada transaksi"
                  description="Catat transaksi pertama Anda dalam hitungan detik."
                  action={
                    <Button onClick={() => navigate('/pos')} leftIcon={<Plus className="h-4 w-4" />}>
                      Buka Kasir
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((trx) => (
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
