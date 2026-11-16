import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { RevenueChart } from '@/features/dashboard/components/RevenueChart';
import { TransactionListItem } from '@/features/dashboard/components/TransactionListItem';
import { PAYMENT_METHOD_LABELS } from '@/features/receipt/receiptService';
import {
  exportReportCsv,
  exportReportPdf,
  loadReportData,
  type FullReportData,
} from '@/features/reports/reportService';
import { formatDateId, getRangeForPreset, type ReportPeriodPreset } from '@/lib/date';
import { formatRupiah } from '@/lib/money';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

export function ReportsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const showToast = useUiStore((s) => s.showToast);

  const [preset, setPreset] = useState<ReportPeriodPreset>('daily');
  const initialRange = getRangeForPreset('daily', settings.week_start);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'void'>('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FullReportData | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  const handlePresetChange = (next: ReportPeriodPreset) => {
    setPreset(next);
    if (next !== 'custom') {
      const range = getRangeForPreset(next, settings.week_start);
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const load = useCallback(async () => {
    if (!from || !to || from > to) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loadReportData(from, to, statusFilter);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat laporan.');
    } finally {
      setLoading(false);
    }
  }, [from, to, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExportCsv = async () => {
    if (!data) return;
    setExporting('csv');
    try {
      const filename = await exportReportCsv(from, to, data);
      showToast(`Laporan CSV diekspor (${filename})`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal ekspor CSV.', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (!data) return;
    setExporting('pdf');
    try {
      const filename = await exportReportPdf(from, to, settings, data);
      showToast(`Laporan PDF diekspor (${filename})`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal ekspor PDF.', 'error');
    } finally {
      setExporting(null);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Laporan Keuangan"
        subtitle={`${formatDateId(from)} — ${formatDateId(to)}`}
        rightSlot={
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              loading={exporting === 'csv'}
              disabled={!data}
              onClick={handleExportCsv}
              leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            >
              CSV
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={exporting === 'pdf'}
              disabled={!data}
              onClick={handleExportPdf}
              leftIcon={<Download className="h-4 w-4" />}
            >
              PDF
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-4">
        {/* Period Tabs */}
        <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-stone-200 bg-white p-1">
          {(
            [
              { id: 'daily', label: 'Harian' },
              { id: 'weekly', label: 'Mingguan' },
              { id: 'monthly', label: 'Bulanan' },
              { id: 'custom', label: 'Kustom' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handlePresetChange(tab.id)}
              className={`min-h-[40px] rounded-xl text-xs font-semibold transition sm:text-sm ${
                preset === tab.id ? 'bg-brand-900 text-white shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <Card className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Dari Tanggal"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              label="Sampai Tanggal"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            {from > to && (
              <p className="text-xs font-medium text-danger sm:col-span-2">
                Tanggal awal tidak boleh lebih besar dari tanggal akhir.
              </p>
            )}
          </Card>
        )}

        {loading && <PageSkeleton />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && data && (
          <>
            {/* Featured Total Omzet Hero + Supporting Metrics */}
            <div className="space-y-3">
              <div className="overflow-hidden rounded-2xl bg-brand-900 p-5 text-white shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-copper-400">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Total Omzet</span>
                    </div>
                    <p className="tabular-nums font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      {formatRupiah(data.summary.totalRevenue)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-right">
                    <p className="text-[11px] font-medium text-stone-400">Periode Laporan</p>
                    <p className="text-xs font-semibold text-stone-200">
                      {formatDateId(from)} — {formatDateId(to)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <Card className="p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Transaksi
                  </p>
                  <p className="tabular-nums mt-1 text-lg font-bold text-brand-900 sm:text-xl">
                    {data.summary.trxCount}
                  </p>
                  {data.summary.voidCount > 0 && (
                    <p className="mt-0.5 text-[11px] font-medium text-danger">
                      {data.summary.voidCount} void
                    </p>
                  )}
                </Card>
                <Card className="p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Rata-rata
                  </p>
                  <p className="tabular-nums mt-1 truncate text-sm font-bold text-brand-900 sm:text-lg">
                    {formatRupiah(data.summary.averageTransaction)}
                  </p>
                </Card>
                <Card className="p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Total Diskon
                  </p>
                  <p className="tabular-nums mt-1 truncate text-sm font-bold text-danger sm:text-lg">
                    -{formatRupiah(data.summary.totalDiscount)}
                  </p>
                </Card>
              </div>
            </div>

            {data.series.length > 1 && (
              <RevenueChart title="Tren Omzet Periode Terpilih" data={data.series} />
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* By Service */}
              <Card>
                <h2 className="mb-3 text-base font-bold text-brand-900">Pendapatan per Layanan</h2>
                {data.byService.length === 0 ? (
                  <p className="text-sm text-muted">Belum ada data pada rentang ini.</p>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {data.byService.map((row) => (
                      <div
                        key={row.service_name}
                        className="flex items-center justify-between py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-ink">{row.service_name}</p>
                          <p className="text-xs text-muted">{row.qty} item</p>
                        </div>
                        <span className="tabular-nums font-bold text-brand-900">
                          {formatRupiah(row.revenue)}
                        </span>
                      </div>
                    ))}
                    {data.summary.totalDiscount > 0 && (
                      <div className="flex items-center justify-between pt-2.5 text-sm text-danger">
                        <span>Potongan Diskon Transaksi</span>
                        <span className="tabular-nums font-semibold">
                          -{formatRupiah(data.summary.totalDiscount)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* By Barber & Payment Method */}
              <div className="space-y-4">
                <Card>
                  <h2 className="mb-3 text-base font-bold text-brand-900">Pendapatan per Barber</h2>
                  {data.byBarber.length === 0 ? (
                    <p className="text-sm text-muted">Belum ada data pada rentang ini.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {data.byBarber.map((row) => (
                        <div
                          key={row.barber_id}
                          className="flex items-center justify-between py-2.5 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-ink">{row.barber_name}</p>
                            <p className="text-xs text-muted">{row.trx_count} transaksi</p>
                          </div>
                          <span className="tabular-nums font-bold text-brand-900">
                            {formatRupiah(row.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card>
                  <h2 className="mb-3 text-base font-bold text-brand-900">Metode Pembayaran</h2>
                  {data.byPaymentMethod.length === 0 ? (
                    <p className="text-sm text-muted">Belum ada data pada rentang ini.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {data.byPaymentMethod.map((row) => (
                        <div
                          key={row.payment_method}
                          className="flex items-center justify-between py-2.5 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-ink">
                              {PAYMENT_METHOD_LABELS[row.payment_method] ?? row.payment_method}
                            </p>
                            <p className="text-xs text-muted">{row.trx_count} transaksi</p>
                          </div>
                          <span className="tabular-nums font-bold text-brand-900">
                            {formatRupiah(row.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* Transaction list for range */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-brand-900">
                  Daftar Transaksi ({data.transactions.length})
                </h2>
                <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 text-xs font-semibold">
                  {(
                    [
                      { id: 'all', label: 'Semua' },
                      { id: 'completed', label: 'Selesai' },
                      { id: 'void', label: 'Void' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      className={`rounded-lg px-3 py-1 transition ${
                        statusFilter === st.id
                          ? 'bg-brand-900 text-white'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {data.transactions.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-6 w-6" />}
                  title="Belum ada transaksi"
                  description="Tidak ada transaksi pada rentang tanggal yang dipilih."
                />
              ) : (
                <div className="space-y-2.5">
                  {data.transactions.map((trx) => (
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
