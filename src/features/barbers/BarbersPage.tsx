import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Edit3, Plus, Trash2, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  createBarber,
  deleteBarber,
  listBarbersWithStats,
  updateBarber,
} from '@/db/repositories/barberRepo';
import { barberFormSchema } from '@/features/barbers/schema';
import { formatRupiah } from '@/lib/money';
import { formatPhoneDisplay } from '@/lib/phone';
import { useUiStore } from '@/stores/uiStore';
import type { BarberWithStats } from '@/types/domain';

export function BarbersPage() {
  const showToast = useUiStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barbers, setBarbers] = useState<BarberWithStats[]>([]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BarberWithStats | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BarberWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listBarbersWithStats();
      setBarbers(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data barber.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setPhone('');
    setIsActive(true);
    setFormError(null);
    setSheetOpen(true);
  };

  const openEdit = (b: BarberWithStats) => {
    setEditing(b);
    setName(b.name);
    setPhone(b.phone ? formatPhoneDisplay(b.phone) : '');
    setIsActive(b.is_active === 1);
    setFormError(null);
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = barberFormSchema.safeParse({ name, phone, is_active: isActive });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || 'Periksa kembali input Anda.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateBarber(editing.id, {
          name: parsed.data.name,
          phone: parsed.data.phone || null,
          is_active: parsed.data.is_active,
        });
        showToast('Data barber diperbarui.', 'success');
      } else {
        await createBarber({
          name: parsed.data.name,
          phone: parsed.data.phone || null,
          is_active: parsed.data.is_active,
        });
        showToast('Barber ditambahkan.', 'success');
      }
      setSheetOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan barber.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteBarber(deleteTarget.id);
      showToast(
        res === 'archived'
          ? 'Barber diarsipkan karena sudah memiliki riwayat transaksi.'
          : 'Barber dihapus.',
        'success',
      );
      setDeleteTarget(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus barber.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Manajemen Barber"
        subtitle="Tim kapster / barber"
        backTo="/more"
        rightSlot={
          <Button size="sm" onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>
            Tambah
          </Button>
        }
      />

      <div className="mx-auto max-w-4xl space-y-3 px-4 py-4">
        {loading && <PageSkeleton />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && barbers.length === 0 && (
          <EmptyState
            icon={<UserCheck className="h-6 w-6" />}
            title="Belum ada barber"
            description="Tambahkan minimal satu barber untuk mulai mencatat transaksi di Kasir."
            action={
              <Button onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>
                Tambah Barber
              </Button>
            }
          />
        )}

        {!loading &&
          !error &&
          barbers.map((barber) => (
            <Card key={barber.id} className="flex items-center justify-between gap-3">
              <Link to={`/barbers/${barber.id}`} className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-bold text-brand-900">{barber.name}</p>
                  <Badge variant={barber.is_active === 1 ? 'success' : 'neutral'}>
                    {barber.is_active === 1 ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <p className="text-xs text-muted">
                  {barber.trx_count} transaksi · {barber.unique_customers} pelanggan unik ·{' '}
                  <span className="tabular-nums font-semibold text-brand-700">
                    {formatRupiah(barber.total_revenue)}
                  </span>
                </p>
              </Link>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(barber)}
                  aria-label={`Edit ${barber.name}`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-ink hover:bg-stone-100"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(barber)}
                  aria-label={`Hapus ${barber.name}`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-danger hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link
                  to={`/barbers/${barber.id}`}
                  aria-label={`Detail ${barber.name}`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-stone-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          ))}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit Barber' : 'Tambah Barber'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Barber *"
            placeholder="Mis. Dimas"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Nomor HP / WhatsApp (Opsional)"
            placeholder="081234567890"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-600"
            />
            <span>Aktif (dapat dipilih di Kasir)</span>
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
        title="Hapus Barber?"
        description={`Barber "${deleteTarget?.name ?? ''}" akan diarsipkan jika sudah pernah menangani transaksi.`}
        confirmLabel="Hapus"
      />
    </AppShell>
  );
}

