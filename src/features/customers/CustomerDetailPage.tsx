import { useCallback, useEffect, useState } from 'react';
import { Edit3, MessageCircle, Scissors, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Input, TextArea } from '@/components/ui/Input';
import { BottomSheet, Modal } from '@/components/ui/Modal';
import { PageSkeleton } from '@/components/ui/Skeleton';
import {
  deleteCustomer,
  getCustomerById,
  getCustomerFavoriteService,
  updateCustomer,
  updateCustomerNotes,
} from '@/db/repositories/customerRepo';
import { listTransactions } from '@/db/repositories/transactionRepo';
import { customerFormSchema } from '@/features/customers/schema';
import { TransactionListItem } from '@/features/dashboard/components/TransactionListItem';
import { buildFollowUpMessage, buildWhatsAppUrl } from '@/features/receipt/receiptService';
import { formatDateId } from '@/lib/date';
import { formatRupiah } from '@/lib/money';
import { formatPhoneDisplay } from '@/lib/phone';
import { openExternalUrl } from '@/platform/browser';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import type { CustomerWithStats, TransactionWithItems } from '@/types/domain';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const showToast = useUiStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerWithStats | null>(null);
  const [favoriteService, setFavoriteService] = useState<{
    service_name: string;
    count: number;
  } | null>(null);
  const [history, setHistory] = useState<TransactionWithItems[]>([]);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Edit sheet
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Follow-up WA modal
  const [waOpen, setWaOpen] = useState(false);
  const [waMessage, setWaMessage] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [cust, fav, trxs] = await Promise.all([
        getCustomerById(id),
        getCustomerFavoriteService(id),
        listTransactions({ customerId: id, limit: 100, offset: 0 }),
      ]);
      if (!cust) {
        setError('Pelanggan tidak ditemukan.');
        return;
      }
      setCustomer(cust);
      setNotesDraft(cust.notes ?? '');
      setFavoriteService(fav);
      setHistory(trxs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail pelanggan.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveNotes = async () => {
    if (!customer) return;
    setSavingNotes(true);
    try {
      await updateCustomerNotes(customer.id, notesDraft);
      showToast('Catatan pelanggan disimpan.', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan catatan.', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const openEdit = () => {
    if (!customer) return;
    setEditName(customer.name);
    setEditPhone(customer.phone ? formatPhoneDisplay(customer.phone) : '');
    setEditNotes(customer.notes ?? '');
    setEditError(null);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const parsed = customerFormSchema.safeParse({
      name: editName,
      phone: editPhone,
      notes: editNotes,
    });
    if (!parsed.success) {
      setEditError(parsed.error.issues[0]?.message || 'Periksa data input.');
      return;
    }
    setSavingEdit(true);
    try {
      await updateCustomer(customer.id, {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null,
      });
      showToast('Profil pelanggan diperbarui.', 'success');
      setEditOpen(false);
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal memperbarui pelanggan.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    setDeleting(true);
    try {
      const outcome = await deleteCustomer(customer.id);
      showToast(
        outcome === 'archived'
          ? 'Pelanggan diarsipkan (riwayat transaksi tetap terjaga).'
          : 'Pelanggan dihapus.',
        'success',
      );
      navigate('/customers', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus pelanggan.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openFollowUpModal = () => {
    if (!customer) return;
    setWaMessage(
      buildFollowUpMessage(
        settings.followup_template,
        customer.name,
        customer.last_visit,
        settings.shop_name,
      ),
    );
    setWaOpen(true);
  };

  const handleSendFollowUp = async () => {
    if (!customer?.phone) return;
    try {
      const url = buildWhatsAppUrl(customer.phone, waMessage);
      await openExternalUrl(url);
      setWaOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuka WhatsApp.', 'error');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={customer ? customer.name : 'Detail Pelanggan'}
        subtitle={customer?.phone ? formatPhoneDisplay(customer.phone) : 'Tanpa nomor WhatsApp'}
        backTo="/customers"
        rightSlot={
          customer && (
            <>
              <button
                type="button"
                onClick={openEdit}
                aria-label="Edit pelanggan"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-ink hover:bg-stone-100"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                aria-label="Hapus pelanggan"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-danger hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )
        }
      />

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        {loading && <PageSkeleton />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && customer && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card>
                <p className="text-xs text-muted">Total Kunjungan</p>
                <p className="tabular-nums mt-1 text-2xl font-bold text-brand-900">
                  {customer.visit_count}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-muted">Total Pengeluaran</p>
                <p className="tabular-nums mt-1 text-lg font-bold text-brand-900">
                  {formatRupiah(customer.total_spent)}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-muted">Layanan Favorit</p>
                <p className="mt-1 truncate text-sm font-bold text-brand-900">
                  {favoriteService ? `${favoriteService.service_name} (${favoriteService.count}x)` : '-'}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-muted">Terakhir Berkunjung</p>
                <p className="mt-1 text-sm font-bold text-brand-900">
                  {customer.last_visit ? formatDateId(customer.last_visit) : 'Belum pernah'}
                </p>
              </Card>
            </div>

            {customer.phone && (
              <Button
                variant="success"
                fullWidth
                size="lg"
                onClick={openFollowUpModal}
                leftIcon={<MessageCircle className="h-5 w-5" />}
              >
                Follow-up WhatsApp
              </Button>
            )}

            <Card className="space-y-3">
              <TextArea
                label="Catatan Khusus Pelanggan"
                placeholder="Mis. Suka fade tipis, nomor sisir 2, sensitif terhadap produk tertentu"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveNotes} loading={savingNotes}>
                  Simpan Catatan
                </Button>
              </div>
            </Card>

            <section className="space-y-2.5">
              <h2 className="text-base font-bold text-brand-900">Riwayat Kunjungan</h2>
              {history.length === 0 ? (
                <EmptyState
                  icon={<Scissors className="h-6 w-6" />}
                  title="Belum ada kunjungan"
                  description="Pelanggan ini belum memiliki riwayat transaksi."
                />
              ) : (
                <div className="space-y-2.5">
                  {history.map((trx) => (
                    <TransactionListItem key={trx.id} trx={trx} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Pelanggan">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Nama Pelanggan *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <Input
            label="Nomor WhatsApp"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            inputMode="tel"
          />
          <TextArea
            label="Catatan"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={3}
          />
          {editError && <p className="text-xs font-medium text-danger">{editError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button type="submit" fullWidth loading={savingEdit}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </BottomSheet>

      <Modal open={waOpen} onClose={() => setWaOpen(false)} title="Follow-up WhatsApp">
        <div className="space-y-4">
          <TextArea
            label="Pesan WhatsApp (dapat diedit)"
            value={waMessage}
            onChange={(e) => setWaMessage(e.target.value)}
            rows={4}
          />
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setWaOpen(false)}>
              Batal
            </Button>
            <Button
              variant="success"
              fullWidth
              onClick={handleSendFollowUp}
              leftIcon={<MessageCircle className="h-4 w-4" />}
            >
              Kirim via WhatsApp
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Hapus Pelanggan?"
        description="Jika pelanggan memiliki riwayat transaksi, data akan diarsipkan agar laporan historis tetap akurat."
        confirmLabel="Hapus"
      />
    </AppShell>
  );
}

