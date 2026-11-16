import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from '@/components/ui/Toast';
import { ErrorState } from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { PinLockScreen } from '@/features/settings/PinLockScreen';
import { subscribeToAppBackground } from '@/platform/lifecycle';
import { AppRoutes } from '@/routes';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

export function App({ onRetryBoot }: { onRetryBoot: () => void }) {
  const isAppReady = useUiStore((s) => s.isAppReady);
  const dbError = useUiStore((s) => s.dbError);
  const isPinLocked = useUiStore((s) => s.isPinLocked);
  const setPinLocked = useUiStore((s) => s.setPinLocked);
  const pinHash = useSettingsStore((s) => s.settings.pin_hash);
  const pinSalt = useSettingsStore((s) => s.settings.pin_salt);

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

  if (!isAppReady) {
    return (
      <div className="mx-auto min-h-screen max-w-md p-6 pt-16">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ToastContainer />
      {isPinLocked && <PinLockScreen />}
      <AppRoutes />
    </BrowserRouter>
  );
}

