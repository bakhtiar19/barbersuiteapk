import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Edit3, Plus, Scissors, Search, Trash2, X } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/Modal';
import { PageSkeleton } from '@/components/ui/Skeleton';
import {
  createService,
  deleteService,
  listServices,
  toggleServiceActive,
  updateService,
} from '@/db/repositories/serviceRepo';
import { serviceFormSchema } from '@/features/services/schema';
import { formatRupiah } from '@/lib/money';
import { useUiStore } from '@/stores/uiStore';
import type { Service } from '@/types/domain';

type StatusFilter = 'all' | 'active' | 'inactive';

export function ServicesPage() {
  const showToast = useUiStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listServices();
      setServices(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat layanan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const s of services) {
      if (s.is_active === 1) active++;
      else inactive++;
    }
    return { all: services.length, active, inactive };
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((svc) => {
      if (statusFilter === 'active' && svc.is_active !== 1) return false;
      if (statusFilter === 'inactive' && svc.is_active === 1) return false;
      if (!q) return true;
      return svc.name.toLowerCase().includes(q) || String(svc.price).includes(q);
    });
  }, [services, search, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setPrice('');
    setDuration('');
    setIsActive(true);
    setFormError(null);
    setSheetOpen(true);
  };

  const openEdit = (svc: Service) => {
    setEditing(svc);
    setName(svc.name);
    setPrice(String(svc.price));
    setDuration(svc.duration_minutes ? String(svc.duration_minutes) : '');
    setIsActive(svc.is_active === 1);
    setFormError(null);
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = serviceFormSchema.safeParse({
      name,
      price,
      duration_minutes: duration === '' ? null : duration,
      is_active: isActive,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || 'Periksa kembali data layanan.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateService(editing.id, parsed.data);
        showToast('Layanan diperbarui.', 'success');
      } else {
        await createService(parsed.data);
        showToast('Layanan ditambahkan.', 'success');
      }
      setSheetOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan layanan.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (svc: Service) => {
    try {
      await toggleServiceActive(svc.id, svc.is_active !== 1);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah status layanan.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteService(deleteTarget.id);
      showToast(
        res === 'archived'
          ? 'Layanan diarsipkan karena sudah dipakai di transaksi.'
          : 'Layanan dihapus.',
        'success',
      );
      setDeleteTarget(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus layanan.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Manajemen Layanan"
        subtitle={`${counts.active} aktif dari ${counts.all} layanan`}
        backTo="/more"
        rightSlot={
          <Button size="sm" onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>
            Tambah
          </Button>
        }
      />

      <div className="mx-auto max-w-5xl space-y-3.5 px-4 py-4">
        {/* Fast Search & Filter Bar for Large Catalogs */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Cari nama atau harga layanan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-stone-200 bg-white pl-10 pr-9 text-sm text-ink placeholder:text-stone-400 focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/10"
            />
            {search && (
              <button
                type="button"
                aria-label="Hapus pencarian"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-stone-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 text-xs font-semibold">
            {(
              [
                { id: 'all', label: `Semua (${counts.all})` },
                { id: 'active', label: `Aktif (${counts.active})` },
                { id: 'inactive', label: `Nonaktif (${counts.inactive})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`min-h-[34px] rounded-lg px-3 transition ${
                  statusFilter === tab.id
                    ? 'bg-brand-900 text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <PageSkeleton />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && filteredServices.length === 0 && (
          <EmptyState
            icon={<Scissors className="h-6 w-6" />}
            title={search || statusFilter !== 'all' ? 'Layanan tidak ditemukan' : 'Belum ada layanan'}
            description={
              search || statusFilter !== 'all'
                ? 'Coba ubah kata kunci pencarian atau filter status layanan.'
                : 'Tambahkan layanan yang tersedia di barbershop Anda.'
            }
            action={
              !search && statusFilter === 'all' ? (
                <Button onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>
                  Tambah Layanan
                </Button>
              ) : undefined
            }
          />
        )}

        {!loading && !error && filteredServices.length > 0 && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {filteredServices.map((svc) => (
              <Card
                key={svc.id}
                className={`flex items-center justify-between gap-3 transition ${
                  svc.is_active === 1 ? 'bg-white' : 'bg-stone-50/80 opacity-75'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-brand-900">{svc.name}</p>
                    <Badge variant={svc.is_active === 1 ? 'success' : 'neutral'}>
                      {svc.is_active === 1 ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="tabular-nums font-mono text-sm font-bold text-copper-600">
                      {formatRupiah(svc.price)}
                    </span>
                    {svc.duration_minutes && (
                      <span className="inline-flex items-center gap-1 text-stone-500">
                        <Clock className="h-3 w-3" />
                        {svc.duration_minutes} mnt
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(svc)}
                    className="min-h-[36px] rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-ink transition hover:border-stone-300 hover:bg-stone-50"
                  >
                    {svc.is_active === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(svc)}
                    aria-label={`Edit ${svc.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-ink hover:bg-stone-100"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(svc)}
                    aria-label={`Hapus ${svc.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-danger hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit Layanan' : 'Tambah Layanan'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Layanan *"
            placeholder="Mis. Haircut + Beard Trim"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Harga (Rp) *"
            type="number"
            min={0}
            step={500}
            placeholder="50000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <Input
            label="Durasi Menit (Opsional)"
            type="number"
            min={1}
            placeholder="30"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-brand-900 focus:ring-brand-900"
            />
            <span>Aktif (tampil di Kasir)</span>
          </label>
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Hapus Layanan?"
        description={`Layanan "${deleteTarget?.name ?? ''}" akan dihapus atau diarsipkan jika sudah pernah tercatat pada transaksi.`}
        confirmLabel="Hapus"
      />
    </AppShell>
  );
}
