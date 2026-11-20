import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@/App';
import { initDatabase, queryOne } from '@/db/client';
import { listBarbers } from '@/db/repositories/barberRepo';
import { getAllSettings, updateSettings } from '@/db/repositories/settingsRepo';
import { checkAndRunAutoBackupOnBoot } from '@/features/backup/backupService';
import { syncTrialMetadata } from '@/lib/license';
import { scheduleBackupReminder } from '@/platform/notifications';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import '@/styles/index.css';

async function bootstrapApp() {
  const ui = useUiStore.getState();
  ui.setDbError(null);

  if (Capacitor.isNativePlatform()) {
    void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);
    void StatusBar.setBackgroundColor({ color: '#0D0D0D' }).catch(() => undefined);
    void StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  }

  try {
    await initDatabase();

    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      const persisted = await navigator.storage.persist().catch(() => false);
      ui.setStoragePersisted(persisted);
    }

    let settings = await getAllSettings();
    const activeBarbers = await listBarbers({ activeOnly: true });

    // If user already has barbers (e.g. from restored backup), ensure onboarding flag matches
    if (!settings.onboarding_completed && activeBarbers.length > 0) {
      settings = await updateSettings({ onboarding_completed: true });
    }

    const settingsStore = useSettingsStore.getState();
    settingsStore.setSettings(settings);
    if (activeBarbers.length > 0) {
      settingsStore.setLastBarberId(activeBarbers[0].id);
    }

    if (settings.pin_hash && settings.pin_salt) {
      ui.setPinLocked(true);
    }

    ui.setAppReady(true);

    // Background safety tasks & admin trial tracking (non-blocking)
    void checkAndRunAutoBackupOnBoot(settings).catch(() => undefined);
    void scheduleBackupReminder(settings.backup_interval_days).catch(() => undefined);

    void (async () => {
      try {
        const trxRow = await queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM transactions');
        await syncTrialMetadata({
          shop_name: settings.shop_name,
          shop_phone: settings.shop_phone,
          shop_address: settings.shop_address,
          total_transactions: trxRow?.total || 0,
          app_version: 'v4.2.0',
        });
      } catch {}
    })();
  } catch (err) {
    ui.setDbError(
      err instanceof Error
        ? `Gagal menginisialisasi database SQLite lokal: ${err.message}`
        : 'Gagal menginisialisasi database SQLite lokal.',
    );
  } finally {
    if (Capacitor.isNativePlatform()) {
      void SplashScreen.hide().catch(() => undefined);
    }
  }
}

void bootstrapApp();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App onRetryBoot={() => void bootstrapApp()} />
  </StrictMode>,
);

