import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Plus, Search, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Input, TextArea } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { PageSkeleton } from '@/components/ui/Skeleton';
import {
  createCustomer,
  listCustomersWithStats,
  type CustomerSortBy,
} from '@/db/repositories/customerRepo';
import { customerFormSchema } from '@/features/customers/schema';
import { formatDateId, getDaysSince } from '@/lib/date';
import { formatRupiah } from '@/lib/money';
import { formatPhoneDisplay } from '@/lib/phone';
import { useUiStore } from '@/stores/uiStore';
import type { CustomerWithStats } from '@/types/domain';

export function CustomersPage() {
  const showToast = useUiStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CustomerSortBy>('last_visit');
  const [inactiveFilter, setInactiveFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listCustomersWithStats({
        search,
        sort,
        inactiveOverDays: inactiveFilter ? 30 : undefined,
      });
      setCustomers(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data pelanggan.');
    } finally {
      setLoading(false);
    }
  }, [search, sort, inactiveFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = customerFormSchema.safeParse({ name, phone, notes });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || 'Periksa input Anda.');
      return;
    }

    setSaving(true);
    try {
      await createCustomer({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null,
      });
      showToast('Pelanggan berhasil ditambahkan.', 'success');
      setSheetOpen(false);
      setName('');
      setPhone('');
      setNotes('');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menambahkan pelanggan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Pelanggan"
        subtitle={`${customers.length} pelanggan`}
        rightSlot={
          <Button
            size="sm"
            onClick={() => {
              setFormError(null);
              setSheetOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Tambah
          </Button>
        }
      />

      <div className="mx-auto max-w-5xl space-y-3 px-4 py-4">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted" />
            <input
              type="search"
              placeholder="Cari nama atau nomor WhatsApp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
          </div>

          <div className="sm:w-52">
            <Select
              aria-label="Urutkan pelanggan"
              value={sort}
              onChange={(e) => setSort(e.target.value as CustomerSortBy)}
              options={[
                { value: 'last_visit', label: 'Terakhir Berkunjung' },
                { value: 'total_spent', label: 'Total Belanja' },
                { value: 'name', label: 'Nama (A-Z)' },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInactiveFilter((v) => !v)}
            className={`min-h-[36px] rounded-full border px-3.5 py-1 text-xs font-semibold transition ${
              inactiveFilter
                ? 'border-brand-600 bg-brand-50 text-brand-800'
                : 'border-stone-300 bg-white text-muted hover:text-ink'
            }`}
          >
            Belum berkunjung &gt; 30 hari
          </button>
        </div>

        {loading && <PageSkeleton />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && customers.length === 0 && (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={inactiveFilter ? 'Semua pelanggan masih aktif berkunjung' : 'Belum ada pelanggan'}
            description={
              inactiveFilter
                ? 'Tidak ada pelanggan yang belum berkunjung lebih dari 30 hari.'
                : 'Pelanggan akan otomatis tercatat saat Anda menyimpan transaksi di Kasir.'
            }
            action={
              !inactiveFilter && (
                <Button
                  onClick={() => setSheetOpen(true)}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                >
                  Tambah Pelanggan
                </Button>
              )
            }
          />
        )}

        {!loading && !error && customers.length > 0 && (
          <div className="space-y-2.5">
            {customers.map((c) => {
              const daysAgo = getDaysSince(c.last_visit);
              return (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white px-4 py-3.5 transition hover:border-brand-300"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-brand-900">{c.name}</p>
                      {daysAgo !== null && daysAgo > 30 && (
                        <Badge variant="warning">{daysAgo} hari lalu</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      {c.phone ? formatPhoneDisplay(c.phone) : 'Tanpa WhatsApp'} · {c.visit_count}{' '}
                      kunjungan
                      {c.last_visit ? ` · Terakhir ${formatDateId(c.last_visit)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="tabular-nums text-sm font-bold text-brand-900">
                      {formatRupiah(c.total_spent)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-stone-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Tambah Pelanggan">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nama Pelanggan *"
            placeholder="Mis. Andi Pratama"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Nomor WhatsApp (Opsional)"
            placeholder="081234567890"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <TextArea
            label="Catatan Khusus (Opsional)"
            placeholder="Mis. Suka fade tipis, alergi pomade tertentu"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          {formError && <p className="text-xs font-medium text-danger">{formError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setSheetOpen(false)}>
              Batal
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              Simpan
            </Button>
          </div>
        </form>
      </BottomSheet>
    </AppShell>
  );
}

