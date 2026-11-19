import { useEffect, useState } from 'react';
import { MoreVertical, Share, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/Modal';
import {
  dismissHomeInstallBanner,
  hasDeferredInstallPrompt,
  isHomeInstallDismissed,
  isIosDevice,
  isRunningStandalone,
  subscribePwaInstall,
  triggerPwaInstall,
} from '@/platform/pwaInstall';
import { useUiStore } from '@/stores/uiStore';

/**
 * Prompts web users to pin Barber Suite to their phone's home screen.
 * Triggers native browser install prompt when supported, or shows a quick guide.
 */
export function AddToHomeScreenBanner() {
  const showToast = useUiStore((s) => s.showToast);

  const [hidden, setHidden] = useState(
    () => isRunningStandalone() || isHomeInstallDismissed(),
  );
  const [canPrompt, setCanPrompt] = useState(() => hasDeferredInstallPrompt());
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const syncState = () => {
      if (isRunningStandalone()) {
        setHidden(true);
        return;
      }
      setCanPrompt(hasDeferredInstallPrompt());
    };

    syncState();
    return subscribePwaInstall(syncState);
  }, []);

  if (hidden) return null;

  const isIos = isIosDevice();

  const handleDismiss = () => {
    dismissHomeInstallBanner();
    setHidden(true);
  };

  const handleInstallClick = async () => {
    if (canPrompt) {
      const outcome = await triggerPwaInstall();
      if (outcome === 'accepted') {
        setHidden(true);
        showToast('Barber Suite ditambahkan ke layar utama.', 'success');
        return;
      }
      if (outcome === 'dismissed') return;
    }

    setGuideOpen(true);
  };

  const androidSteps = (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-1.5">
      <p className="text-xs font-bold text-brand-900">Android (Chrome)</p>
      <ol className="list-decimal space-y-1 pl-4 text-xs text-ink/80">
        <li>
          Ketuk ikon menu <MoreVertical className="inline h-3.5 w-3.5 align-text-bottom" /> di pojok
          kanan atas browser.
        </li>
        <li>
          Pilih <strong>Tambahkan ke layar utama</strong> (<em>Add to Home screen</em>).
        </li>
        <li>
          Ketuk <strong>Tambahkan</strong> / <strong>Pasang</strong> untuk konfirmasi.
        </li>
      </ol>
    </div>
  );

  const iosSteps = (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-1.5">
      <p className="text-xs font-bold text-brand-900">iPhone / iPad (Safari)</p>
      <ol className="list-decimal space-y-1 pl-4 text-xs text-ink/80">
        <li>
          Ketuk ikon <strong>Bagikan</strong>{' '}
          <Share className="inline h-3.5 w-3.5 align-text-bottom" /> di bilah browser Safari.
        </li>
        <li>
          Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama</strong> (
          <em>Add to Home Screen</em>).
        </li>
        <li>
          Ketuk <strong>Tambah</strong> di pojok kanan atas.
        </li>
      </ol>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-brand-900">
            <Smartphone className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-900">Tampilkan di layar utama</p>
            <p className="text-xs leading-snug text-muted">
              Akses lebih cepat langsung dari home screen.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void handleInstallClick()}
            className="text-xs"
          >
            Tambahkan
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup pengingat layar utama"
            title="Tutup"
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <BottomSheet
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="Tambahkan ke Layar Utama"
      >
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-muted">
            Pasang pintasan <strong>Barber Suite</strong> di layar utama HP agar bisa dibuka seperti
            aplikasi dengan akses lebih cepat.
          </p>

          {isIos ? (
            <>
              {iosSteps}
              {androidSteps}
            </>
          ) : (
            <>
              {androidSteps}
              {iosSteps}
            </>
          )}

          <Button variant="secondary" fullWidth onClick={() => setGuideOpen(false)}>
            Mengerti
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
