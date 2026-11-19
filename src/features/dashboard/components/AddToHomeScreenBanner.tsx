import { useEffect, useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { HomeScreenInstallGuideSheet } from '@/components/pwa/HomeScreenInstallGuideSheet';
import { Button } from '@/components/ui/Button';
import {
  dismissHomeInstallBanner,
  hasDeferredInstallPrompt,
  isAppInstalled,
  isHomeInstallDismissed,
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
    () => isAppInstalled() || isHomeInstallDismissed(),
  );
  const [canPrompt, setCanPrompt] = useState(() => hasDeferredInstallPrompt());
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const syncState = () => {
      if (isAppInstalled()) {
        setHidden(true);
        return;
      }
      setCanPrompt(hasDeferredInstallPrompt());
    };

    syncState();
    return subscribePwaInstall(syncState);
  }, []);

  if (hidden) return null;

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

      <HomeScreenInstallGuideSheet open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
