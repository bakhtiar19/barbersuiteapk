import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
} from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buildWhatsAppUrl } from '@/features/receipt/receiptService';
import { formatDateId } from '@/lib/date';
import { activateDeviceWithLicense } from '@/lib/license';
import { openExternalUrl } from '@/platform/browser';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

const ACTIVATION_WA_PHONE = '085155177341';

interface Props {
  onActivated: () => void;
  onClose?: () => void;
  initialError?: string;
}

function sanitizeMessage(msg: string): string {
  const lower = msg.toLowerCase();
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('koneksi') ||
    lower.includes('internet') ||
    lower.includes('202.10') ||
    lower.includes('timeout') ||
    lower.includes('server')
  ) {
    return 'Koneksi internet bermasalah. Pastikan perangkat terhubung ke internet lalu coba lagi.';
  }
  if (
    lower.includes('device') ||
    lower.includes('perangkat') ||
    lower.includes('limit') ||
    lower.includes('maksimal')
  ) {
    return 'Kode lisensi sudah digunakan atau tidak dapat diaktifkan. Silakan hubungi admin layanan pelanggan.';
  }
  if (
    lower.includes('not found') ||
    lower.includes('tidak ditemukan') ||
    lower.includes('invalid') ||
    lower.includes('salah')
  ) {
    return 'Kode lisensi tidak valid. Periksa kembali kombinasi huruf dan angka Anda.';
  }
  if (lower.includes('expired') || lower.includes('berakhir') || lower.includes('habis')) {
    return 'Masa berlaku kode lisensi ini telah selesai. Silakan hubungi admin untuk perpanjangan.';
  }
  return msg || 'Aktivasi belum berhasil. Pastikan kode lisensi Anda benar.';
}

function buildActivationWhatsAppMessage(shopName: string): string {
  const cleanShop = shopName.trim();
  const shopLine =
    cleanShop && cleanShop !== 'Barbershop Saya'
      ? `Nama Barbershop: ${cleanShop}`
      : 'Nama Barbershop: (isi nama barbershop Anda)';

  return [
    'Halo Admin Barber Suite, saya ingin aktivasi kode lisensi.',
    '',
    shopLine,
  ].join('\n');
}

export function LicenseActivationScreen({ onActivated, onClose, initialError }: Props) {
  const shopName = useSettingsStore((s) => s.settings.shop_name);
  const licenseStatus = useUiStore((s) => s.licenseStatus);

  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? sanitizeMessage(initialError) : null,
  );

  const cardRef = useRef<HTMLDivElement | null>(null);
  const closingRef = useRef(false);
  const touchStartRef = useRef<{
    x: number;
    y: number;
    axis: 'x' | 'y' | null;
    canDragDown: boolean;
  } | null>(null);

  const isLocked = !onClose;
  const isPaidActive = Boolean(onClose && !licenseStatus.isTrial);

  const requestClose = useCallback(() => {
    if (!onClose || closingRef.current) return;
    closingRef.current = true;
    if (typeof window !== 'undefined' && window.history.state?.licenseModal) {
      window.history.back();
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!onClose) return;
    closingRef.current = false;

    if (!window.history.state?.licenseModal) {
      window.history.pushState({ ...(window.history.state ?? {}), licenseModal: true }, '');
    }

    const onPopState = () => {
      if (!window.history.state?.licenseModal && !closingRef.current) {
        closingRef.current = true;
        onClose();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKey);

    let removeNativeBack: (() => void) | null = null;
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener('backButton', () => {
        requestClose();
      }).then((handle) => {
        removeNativeBack = () => {
          void handle.remove();
        };
      });
    }

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKey);
      removeNativeBack?.();
    };
  }, [onClose, requestClose]);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (!onClose || e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, a, button')) return;

    const touch = e.touches[0];
    if (!touch) return;
    const scrollTop = cardRef.current?.scrollTop ?? 0;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      axis: null,
      canDragDown: scrollTop <= 0,
    };
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!onClose || !start || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (!start.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      start.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    if (start.axis === 'x') {
      setIsDragging(true);
      setDragOffset({ x: dx, y: 0 });
    } else if (start.axis === 'y' && dy > 0 && start.canDragDown) {
      setIsDragging(true);
      setDragOffset({ x: 0, y: dy });
    }
  };

  const handleTouchEnd = () => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const shouldClose =
      Math.abs(dragOffset.x) > 85 || (start.canDragDown && dragOffset.y > 75);

    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });

    if (shouldClose) {
      requestClose();
    }
  };

  const waUrl = useMemo(() => {
    const message = buildActivationWhatsAppMessage(shopName);
    return buildWhatsAppUrl(ACTIVATION_WA_PHONE, message);
  }, [shopName]);

  const handleOpenWhatsApp = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    void openExternalUrl(waUrl);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;

    setError(null);
    setLoading(true);

    try {
      await activateDeviceWithLicense(licenseKey);
      if (typeof window !== 'undefined' && window.history.state?.licenseModal) {
        const nextState = { ...window.history.state };
        delete nextState.licenseModal;
        window.history.replaceState(nextState, '');
      }
      onActivated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(sanitizeMessage(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-modal-title"
    >
      {onClose && <div className="fixed inset-0" onClick={requestClose} aria-hidden="true" />}

      <div
        ref={cardRef}
        style={{
          transform:
            dragOffset.x !== 0 || dragOffset.y !== 0
              ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`
              : undefined,
          transition: isDragging ? 'none' : 'transform 180ms ease-out',
        }}
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200/80 bg-white shadow-2xl"
      >
        <div className="barber-stripe h-1.5" />

        {onClose && (
          <button
            onClick={requestClose}
            type="button"
            className="absolute right-3.5 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-stone-100 hover:text-ink"
            aria-label="Tutup"
            title="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="space-y-5 p-5 sm:p-6">
          {/* Header */}
          <div className="space-y-2.5 pt-1 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-900 text-amber-400 shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div className="flex justify-center">
              {isLocked ? (
                <Badge variant="danger">Masa Uji Coba Berakhir</Badge>
              ) : isPaidActive ? (
                <Badge variant="success">Lisensi Resmi Aktif</Badge>
              ) : (
                <Badge variant={licenseStatus.daysLeft <= 3 ? 'danger' : 'warning'}>
                  Uji Coba Gratis · Sisa {licenseStatus.daysLeft} Hari
                </Badge>
              )}
            </div>

            <div>
              <h1
                id="license-modal-title"
                className="font-display text-xl font-bold tracking-tight text-brand-900"
              >
                {isPaidActive ? 'Lisensi Aplikasi' : 'Aktivasi Barber Suite'}
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {isPaidActive
                  ? 'Perangkat ini sudah menggunakan lisensi resmi. Anda tetap dapat mengganti kode lisensi di bawah ini.'
                  : 'Masukkan kode lisensi resmi untuk membuka akses penuh tanpa batas waktu.'}
              </p>
            </div>
          </div>

          {/* Active License Summary */}
          {isPaidActive && (
            <div className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50/80 p-3 text-xs text-green-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold">
                  {licenseStatus.clientName ? `Terdaftar: ${licenseStatus.clientName}` : 'Lisensi Aktif'}
                </p>
                <p className="text-[11px] text-green-800/80">
                  {licenseStatus.expiresAt
                    ? `Berlaku hingga ${formatDateId(licenseStatus.expiresAt)}`
                    : 'Berlaku permanen pada perangkat terdaftar'}
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <div className="space-y-0.5">
                <p className="font-semibold text-red-950">Aktivasi Belum Berhasil</p>
                <p className="leading-relaxed text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* License Key Form */}
          <form onSubmit={handleActivate} className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="license-key-input"
                className="block text-xs font-semibold uppercase tracking-wider text-muted"
              >
                Kode Lisensi
              </label>
              <div className="relative">
                <input
                  id="license-key-input"
                  type="text"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="BS-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  className="min-h-[48px] w-full rounded-xl border border-stone-300 bg-stone-50 px-4 pr-10 text-center font-mono text-base font-semibold uppercase tracking-widest text-brand-900 placeholder:font-normal placeholder:text-stone-400 transition focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                />
                <KeyRound className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={loading}
              disabled={licenseKey.trim().length < 8}
            >
              {loading
                ? 'Memeriksa Lisensi...'
                : isPaidActive
                  ? 'Perbarui Kode Lisensi'
                  : 'Aktifkan Aplikasi'}
            </Button>
          </form>

          {/* Direct WhatsApp Activation Link & Template */}
          <div className="space-y-2.5 rounded-2xl border border-stone-200/80 bg-stone-50 p-3.5">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-brand-900">
                {isPaidActive ? 'Butuh bantuan atau tambah perangkat?' : 'Belum punya kode lisensi?'}
              </p>
              <p className="text-[11px] leading-relaxed text-muted">
                Hubungi admin via WhatsApp untuk pembelian atau aktivasi kode lisensi resmi.
              </p>
            </div>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenWhatsApp}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span>Hubungi Kami</span>
            </a>
          </div>

          {onClose && (
            <Button type="button" variant="ghost" fullWidth size="sm" onClick={requestClose}>
              {isPaidActive ? 'Tutup' : 'Nanti Saja'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
