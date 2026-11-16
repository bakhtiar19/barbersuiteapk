import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from '@/components/ui/Toast';
import { ErrorState } from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { PinLockScreen } from '@/features/settings/PinLockScreen';
import { LicenseActivationScreen } from '@/features/settings/LicenseActivationScreen';
import { checkAppAccess, AppAccessState } from '@/lib/license';
import { subscribeToAppBackground } from '@/platform/lifecycle';
import { AppRoutes } from '@/routes';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { Sparkles, X } from 'lucide-react';

export function App({ onRetryBoot }: { onRetryBoot: () => void }) {
  const isAppReady = useUiStore((s) => s.isAppReady);
  const dbError = useUiStore((s) => s.dbError);
  const isPinLocked = useUiStore((s) => s.isPinLocked);
  const setPinLocked = useUiStore((s) => s.setPinLocked);
  const pinHash = useSettingsStore((s) => s.settings.pin_hash);
  const pinSalt = useSettingsStore((s) => s.settings.pin_salt);

  const [accessChecked, setAccessChecked] = useState(false);
  const [access, setAccess] = useState<AppAccessState>({
    hasAccess: true,
    isTrial: false,
  });
  const [showTrialBanner, setShowTrialBanner] = useState(true);

  // Check Trial or Paid License status on startup
  useEffect(() => {
    let mounted = true;
    checkAppAccess().then((res) => {
      if (!mounted) return;
      setAccess(res);
      setAccessChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const hasPin = Boolean(pinHash && pinSalt);
    if (!hasPin) return;
    return subscribeToAppBackground(() => {
      setPinLocked(true);
    });
  }, [pinHash, pinSalt, setPinLocked]);

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
        <div className="w-full max-w-md">
          <ErrorState message={dbError} onRetry={onRetryBoot} />
        </div>
      </div>
    );
  }

  if (!isAppReady || !accessChecked) {
    return (
      <div className="mx-auto min-h-screen max-w-md p-6 pt-16">
        <PageSkeleton />
      </div>
    );
  }

  // If trial has expired and no paid license -> Lock app with Activation Screen
  if (!access.hasAccess) {
    return (
      <LicenseActivationScreen
        onActivated={() => {
          checkAppAccess().then(setAccess);
        }}
        initialError={access.error}
      />
    );
  }

  return (
    <BrowserRouter>
      {/* 14-day trial reminder banner */}
      {access.isTrial && showTrialBanner && (
        <div className="bg-amber-500 text-brand-950 px-4 py-2 text-xs font-semibold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-brand-900" />
            <span>
              Mode Uji Coba Gratis 14 Hari: Sisa{' '}
              <strong>{access.daysLeft ?? 14} hari lagi</strong>
            </span>
          </div>
          <button
            onClick={() => setShowTrialBanner(false)}
            className="p-1 hover:bg-amber-600/30 rounded-md transition"
            title="Tutup banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <ToastContainer />
      {isPinLocked && <PinLockScreen />}
      <AppRoutes />
    </BrowserRouter>
  );
}
