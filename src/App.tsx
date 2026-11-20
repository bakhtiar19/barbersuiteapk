import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { ToastContainer } from '@/components/ui/Toast';
import { ErrorState } from '@/components/ui/EmptyState';
import { AppBootLoader } from '@/components/ui/Skeleton';
import { PinLockScreen } from '@/features/settings/PinLockScreen';
import { LicenseActivationScreen } from '@/features/settings/LicenseActivationScreen';
import { checkAppAccess, AppAccessState } from '@/lib/license';
import { subscribeToAppBackground } from '@/platform/lifecycle';
import { AppRoutes } from '@/routes';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { AlertCircle, KeyRound, X } from 'lucide-react';

const TRIAL_FIRST_SEEN_KEY = 'barber_trial_banner_first_seen';

export function App({ onRetryBoot }: { onRetryBoot: () => void }) {
  const isAppReady = useUiStore((s) => s.isAppReady);
  const dbError = useUiStore((s) => s.dbError);
  const isPinLocked = useUiStore((s) => s.isPinLocked);
  const setPinLocked = useUiStore((s) => s.setPinLocked);
  const isLicenseModalOpen = useUiStore((s) => s.isLicenseModalOpen);
  const setLicenseModalOpen = useUiStore((s) => s.setLicenseModalOpen);
  const setLicenseStatus = useUiStore((s) => s.setLicenseStatus);
  const showToast = useUiStore((s) => s.showToast);

  const pinHash = useSettingsStore((s) => s.settings.pin_hash);
  const pinSalt = useSettingsStore((s) => s.settings.pin_salt);

  const [accessChecked, setAccessChecked] = useState(false);
  const [access, setAccess] = useState<AppAccessState>({
    hasAccess: true,
    isTrial: false,
  });
  const [showTrialBanner, setShowTrialBanner] = useState(false);

  // Check Trial or Paid License status on startup
  useEffect(() => {
    let mounted = true;
    checkAppAccess().then(async (res) => {
      if (!mounted) return;
      setAccess(res);
      const days = res.daysLeft ?? 14;
      setLicenseStatus({
        isTrial: res.isTrial,
        daysLeft: days,
        clientName: res.clientName,
        expiresAt: res.expiresAt,
      });

      // Aturan Tampilan Banner Uji Coba:
      // 1. Jika H-3, H-2, H-1, Hari H (sisa <= 3 hari): SELALU TAMPIL
      // 2. Jika masih di atas 3 hari (hari 14 s/d hari 4): HANYA TAMPIL SAAT BUKA PERTAMA KALI
      if (res.isTrial) {
        if (days <= 3) {
          setShowTrialBanner(true);
        } else {
          try {
            const seen = await Preferences.get({ key: TRIAL_FIRST_SEEN_KEY });
            if (!seen.value) {
              // Buka pertama kali -> Tampilkan banner lalu tandai sudah pernah dilihat
              setShowTrialBanner(true);
              await Preferences.set({ key: TRIAL_FIRST_SEEN_KEY, value: 'true' });
            } else {
              // Buka kedua dan seterusnya -> Sembunyikan banner
              setShowTrialBanner(false);
            }
          } catch {
            setShowTrialBanner(false);
          }
        }
      } else {
        setShowTrialBanner(false);
      }

      setAccessChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, [setLicenseStatus]);

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
    return <AppBootLoader />;
  }

  // If trial has expired and no paid license -> Lock app with Activation Screen (no close option)
  if (!access.hasAccess) {
    return (
      <LicenseActivationScreen
        onActivated={async () => {
          const fresh = await checkAppAccess();
          setAccess(fresh);
          setLicenseStatus({
            isTrial: fresh.isTrial,
            daysLeft: fresh.daysLeft ?? 14,
            clientName: fresh.clientName,
            expiresAt: fresh.expiresAt,
          });
          showToast('Lisensi Barber Suite berhasil diaktifkan!', 'success');
        }}
        initialError={access.error}
      />
    );
  }

  const daysLeft = access.daysLeft ?? 14;
  const isCriticalTrial = daysLeft <= 3;

  const basename =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/barbersuite')
      ? '/barbersuite'
      : '/';

  return (
    <BrowserRouter basename={basename}>
      {/* Trial reminder banner */}
      {access.isTrial && showTrialBanner && (
        <div
          className={`${
            isCriticalTrial
              ? 'border-b border-rose-700/30 bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 px-3.5 py-2.5 font-semibold text-white shadow-lg'
              : 'border-b border-gray-200 bg-gray-100 px-3.5 py-2 font-medium text-gray-600'
          } sticky top-0 z-50 flex items-center justify-between gap-2 text-xs transition-all`}
        >
          <div
            className={`flex min-w-0 items-center gap-2 ${
              isCriticalTrial ? '' : 'flex-1 justify-center pl-5 text-center'
            }`}
          >
            {isCriticalTrial && (
              <AlertCircle className="h-4 w-4 shrink-0 animate-pulse text-white" />
            )}
            <span
              className={
                isCriticalTrial
                  ? 'truncate text-xs font-medium'
                  : 'text-[11px] leading-snug text-gray-600 sm:text-xs'
              }
            >
              {isCriticalTrial
                ? daysLeft <= 0
                  ? 'Hari Terakhir Uji Coba: Berakhir Hari Ini!'
                  : `Masa Uji Coba Segera Berakhir: Sisa ${daysLeft} hari lagi!`
                : 'Coba GRATIS 14 hari — tanpa biaya & komitmen di awal'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isCriticalTrial && (
              <button
                onClick={() => setLicenseModalOpen(true)}
                className="flex animate-pulse items-center gap-1.5 rounded-xl border border-white bg-white px-3 py-1.5 text-xs font-extrabold text-rose-700 shadow-xl transition-all hover:scale-105 hover:bg-rose-50 active:scale-95"
              >
                <KeyRound className="h-3.5 w-3.5 text-rose-600" />
                <span>Aktivasi Sekarang</span>
              </button>
            )}
            <button
              onClick={() => setShowTrialBanner(false)}
              className={`rounded-lg p-1 transition ${
                isCriticalTrial
                  ? 'text-white/80 hover:bg-white/20 hover:text-white'
                  : 'text-gray-400 hover:bg-gray-200/70 hover:text-gray-600'
              }`}
              title="Tutup banner sesi ini"
              aria-label="Tutup banner"
            >
              <X className={isCriticalTrial ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
            </button>
          </div>
        </div>
      )}

      {/* Manual License Activation Modal (opened via banner or menu) */}
      {isLicenseModalOpen && (
        <LicenseActivationScreen
          onActivated={async () => {
            setLicenseModalOpen(false);
            const fresh = await checkAppAccess();
            setAccess(fresh);
            setLicenseStatus({
              isTrial: fresh.isTrial,
              daysLeft: fresh.daysLeft ?? 14,
              clientName: fresh.clientName,
              expiresAt: fresh.expiresAt,
            });
            showToast('Lisensi Barber Suite berhasil diaktifkan!', 'success');
          }}
          onClose={() => setLicenseModalOpen(false)}
        />
      )}

      <ToastContainer />
      {isPinLocked && <PinLockScreen />}
      <AppRoutes />
    </BrowserRouter>
  );
}
