import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Home,
  MessageCircle,
  Phone,
  Plus,
  Share2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageSkeleton } from '@/components/ui/Skeleton';
import {
  getTransactionById,
  updateTransactionCustomerPhone,
} from '@/db/repositories/transactionRepo';
import { ReceiptPreview } from '@/features/receipt/ReceiptPreview';
import type { GeneratedReceiptImage } from '@/features/receipt/receiptImage';
import {
  buildAppreciationText,
  copyAppreciationText,
  downloadReceiptImage,
  PAYMENT_METHOD_LABELS,
  sendReceiptImageAndAppreciation,
  shareReceiptImageFile,
} from '@/features/receipt/receiptService';
import { formatRupiah } from '@/lib/money';
import { formatPhoneDisplay, normalizePhone } from '@/lib/phone';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import type { TransactionWithItems } from '@/types/domain';

export function PosSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const showToast = useUiStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [trx, setTrx] = useState<TransactionWithItems | null>(null);
  const [receiptImage, setReceiptImage] = useState<GeneratedReceiptImage | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) {
        setError('ID transaksi tidak ditemukan.');
        setLoading(false);
        return;
      }
      try {
        const data = await getTransactionById(id);
        if (!active) return;
        if (!data) {
          setError('Transaksi tidak ditemukan.');
        } else {
          setTrx(data);
          setPhoneInput(data.customer_phone ? formatPhoneDisplay(data.customer_phone) : '');
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat transaksi.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

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

  return (
    <AppShell hideBottomNav>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-6">
        {loading && <PageSkeleton />}
        {!loading && error && <ErrorState message={error} onRetry={() => navigate('/')} />}

        {!loading && !error && trx && (
          <>
            <Card className="overflow-hidden p-0">
              <div className="bg-brand-900 px-5 py-5 text-center text-white">
                <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-copper-500/40 bg-copper-500/15 text-copper-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h1 className="font-display text-lg font-bold tracking-wide text-white">
                  Transaksi Berhasil!
                </h1>
                <p className="mt-0.5 font-mono text-xs text-stone-400">{trx.trx_number}</p>
                <p className="tabular-nums mt-2 font-mono text-3xl font-extrabold text-copper-400">
                  {formatRupiah(trx.total)}
                </p>
                <p className="mt-1 text-xs text-stone-300">
                  {trx.customer_name} · {PAYMENT_METHOD_LABELS[trx.payment_method]} · Barber{' '}
                  {trx.barber_name}
                </p>
              </div>

              <div className="space-y-2.5 p-4">
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
                    Unduh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareImage}
                    leftIcon={<Share2 className="h-4 w-4" />}
                  >
                    Bagikan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/transactions/${trx.id}`)}
                    leftIcon={<FileText className="h-4 w-4" />}
                  >
                    Detail
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => navigate('/pos', { replace: true })}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Transaksi Baru
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={() => navigate('/', { replace: true })}
                    leftIcon={<Home className="h-4 w-4" />}
                  >
                    Beranda
                  </Button>
                </div>
              </div>
            </Card>

            <ReceiptPreview
              trx={trx}
              settings={settings}
              onImageGenerated={setReceiptImage}
            />

            <Card className="mx-auto w-full max-w-sm space-y-2 border-stone-200/90 bg-white">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Teks Apresiasi Pelanggan
                </p>
                <button
                  type="button"
                  onClick={handleCopyAppreciation}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-copper-600 hover:bg-stone-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Salin
                </button>
              </div>
              <p className="whitespace-pre-line rounded-xl bg-stone-50 p-3 font-mono text-xs leading-relaxed text-ink">
                {buildAppreciationText(trx, settings)}
              </p>
            </Card>
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
    </AppShell>
  );
}
