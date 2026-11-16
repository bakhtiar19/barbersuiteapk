import { useCallback, useEffect, useState } from 'react';
import { Ban, Copy, Download, MessageCircle, Phone, Share2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/EmptyState';
import { Input, TextArea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageSkeleton } from '@/components/ui/Skeleton';
import {
  getTransactionById,
  updateTransactionCustomerPhone,
  voidTransaction,
} from '@/db/repositories/transactionRepo';
import { ReceiptPreview } from '@/features/receipt/ReceiptPreview';
import type { GeneratedReceiptImage } from '@/features/receipt/receiptImage';
import {
  buildAppreciationText,
  copyAppreciationText,
  downloadReceiptImage,
  sendReceiptImageAndAppreciation,
  shareReceiptImageFile,
} from '@/features/receipt/receiptService';
import { formatDateTimeId } from '@/lib/date';
import { formatPhoneDisplay, normalizePhone } from '@/lib/phone';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import type { TransactionWithItems } from '@/types/domain';

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const settings = useSettingsStore((s) => s.settings);
  const showToast = useUiStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trx, setTrx] = useState<TransactionWithItems | null>(null);
  const [receiptImage, setReceiptImage] = useState<GeneratedReceiptImage | null>(null);
  const [sending, setSending] = useState(false);

  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTransactionById(id);
      if (!data) {
        setError('Transaksi tidak ditemukan.');
      } else {
        setTrx(data);
        setPhoneInput(data.customer_phone ? formatPhoneDisplay(data.customer_phone) : '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail transaksi.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendDirectToWhatsApp = async (targetTrx: TransactionWithItems) => {
    setSending(true);
    try {
      const res = await sendReceiptImageAndAppreciation(targetTrx, settings, receiptImage);
      if (res.mode === 'wa-direct') {
        showToast(
          `Mengirim gambar struk & apresiasi ke WhatsApp ${targetTrx.customer_name} (${formatPhoneDisplay(targetTrx.customer_phone)})...`,
          'success',
        );
      } else if (res.mode === 'shared') {
        showToast('Gambar struk & teks apresiasi siap dikirim.', 'success');
      } else {
        showToast('Gambar struk diunduh & teks apresiasi disalin ke clipboard.', 'success');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showToast(err instanceof Error ? err.message : 'Gagal mengirim struk.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!trx) return;
    if (!trx.customer_phone) {
      setPhoneInput('');
      setPhoneModalOpen(true);
      return;
    }
    await sendDirectToWhatsApp(trx);
  };

  const handleConfirmPhoneAndSend = async () => {
    if (!trx) return;
    const normalized = normalizePhone(phoneInput);
    if (!normalized) {
      showToast('Masukkan nomor WhatsApp yang valid (contoh: 081234567890).', 'error');
      return;
    }
    setSavingPhone(true);
    try {
      const updated = await updateTransactionCustomerPhone(trx.id, normalized);
      setTrx(updated);
      setPhoneModalOpen(false);
      await sendDirectToWhatsApp(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan nomor WhatsApp.', 'error');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleShareImage = async () => {
    if (!trx) return;
    try {
      await shareReceiptImageFile(trx, settings, receiptImage);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showToast(err instanceof Error ? err.message : 'Gagal membagikan gambar struk.', 'error');
    }
  };

  const handleDownloadImage = async () => {
    if (!trx) return;
    try {
      const img = await downloadReceiptImage(trx, settings, receiptImage);
      showToast(`Gambar struk diunduh (${Math.round(img.sizeBytes / 1024)} KB).`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengunduh gambar struk.', 'error');
    }
  };

  const handleCopyAppreciation = async () => {
    if (!trx) return;
    try {
      await copyAppreciationText(trx, settings);
      showToast('Teks struk & apresiasi disalin ke clipboard.', 'success');
    } catch {
      showToast('Tidak dapat menyalin teks.', 'error');
    }
  };

  const handleVoidConfirm = async () => {
    if (!trx || !voidReason.trim()) return;
    setVoiding(true);
    try {
      await voidTransaction(trx.id, voidReason);
      showToast('Transaksi dibatalkan (void).', 'success');
      setVoidOpen(false);
      setVoidReason('');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membatalkan transaksi.', 'error');
    } finally {
      setVoiding(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={trx ? trx.trx_number : 'Detail Transaksi'}
        backTo="/transactions"
        rightSlot={
          trx && (
            <Badge variant={trx.status === 'void' ? 'danger' : 'success'}>
              {trx.status === 'void' ? 'VOID' : 'Selesai'}
            </Badge>
          )
        }
      />

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        {loading && <PageSkeleton />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && trx && (
          <>
            {trx.status === 'void' && (
              <Card className="border-red-200 bg-red-50">
                <p className="text-sm font-bold text-danger">Transaksi ini telah dibatalkan (void)</p>
                <p className="mt-1 text-xs text-red-800">
                  Alasan: {trx.void_reason || '-'} ·{' '}
                  {trx.voided_at ? formatDateTimeId(trx.voided_at) : ''}
                </p>
              </Card>
            )}

            <ReceiptPreview
              trx={trx}
              settings={settings}
              onImageGenerated={setReceiptImage}
            />

            <Card className="mx-auto max-w-md border-brand-200/70 bg-brand-50/50 space-y-1.5">
              <p className="text-xs font-bold text-brand-900">Teks Apresiasi Pelanggan</p>
              <p className="whitespace-pre-line font-mono text-xs leading-relaxed text-ink">
                {buildAppreciationText(trx, settings)}
              </p>
            </Card>

            <div className="mx-auto max-w-md space-y-2.5">
              <Button
                variant="success"
                fullWidth
                size="lg"
                loading={sending}
                onClick={handleSendWhatsApp}
                leftIcon={<MessageCircle className="h-5 w-5" />}
              >
                Kirim Struk
              </Button>

              <div className="flex items-center justify-between rounded-xl bg-stone-100/80 px-3 py-1.5 text-xs text-stone-600">
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Phone className="h-3.5 w-3.5 text-stone-400" />
                  {trx.customer_phone
                    ? `Tujuan WA: ${formatPhoneDisplay(trx.customer_phone)}`
                    : 'Nomor WA pelanggan belum diisi'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneInput(
                      trx.customer_phone ? formatPhoneDisplay(trx.customer_phone) : '',
                    );
                    setPhoneModalOpen(true);
                  }}
                  className="ml-2 shrink-0 font-semibold text-copper-600 hover:underline"
                >
                  {trx.customer_phone ? 'Ubah Nomor' : 'Isi Nomor'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadImage}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Unduh Gambar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareImage}
                  leftIcon={<Share2 className="h-4 w-4" />}
                >
                  Bagikan Gambar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAppreciation}
                  leftIcon={<Copy className="h-4 w-4" />}
                >
                  Salin Teks
                </Button>
              </div>

              {trx.status === 'completed' && (
                <Button
                  variant="ghost"
                  fullWidth
                  className="text-danger hover:bg-red-50"
                  onClick={() => setVoidOpen(true)}
                  leftIcon={<Ban className="h-4 w-4" />}
                >
                  Batalkan Transaksi (Void)
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <Modal
        open={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        title="Kirim Struk ke Pelanggan"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted">
            Masukkan nomor WhatsApp untuk pelanggan{' '}
            <span className="font-semibold text-ink">{trx?.customer_name}</span> agar gambar struk &
            teks apresiasi dikirimkan ke nomor pelanggan yang sesuai.
          </p>
          <Input
            label="Nomor WhatsApp Pelanggan *"
            type="tel"
            inputMode="tel"
            placeholder="Contoh: 081234567890"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setPhoneModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="success"
              fullWidth
              loading={savingPhone}
              disabled={!phoneInput.trim()}
              onClick={handleConfirmPhoneAndSend}
              leftIcon={<MessageCircle className="h-4 w-4" />}
            >
              Kirim Struk
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={voidOpen} onClose={() => setVoidOpen(false)} title="Batalkan Transaksi (Void)">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Transaksi yang dibatalkan tidak dihapus permanen, tetapi langsung dikecualikan dari
            omzet dan laporan keuangan.
          </p>
          <TextArea
            label="Alasan Pembatalan *"
            placeholder="Mis. Salah input layanan / pelanggan batal"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setVoidOpen(false)}>
              Tutup
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={voiding}
              disabled={!voidReason.trim()}
              onClick={handleVoidConfirm}
            >
              Ya, Batalkan Transaksi
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
