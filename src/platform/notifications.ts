import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const BACKUP_REMINDER_ID = 1001;

export async function scheduleBackupReminder(intervalDays: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  try {
    const perms = await LocalNotifications.checkPermissions();
    if (perms.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return;
    }

    await LocalNotifications.cancel({ notifications: [{ id: BACKUP_REMINDER_ID }] });

    const fireAt = new Date(Date.now() + Math.max(1, intervalDays) * 24 * 60 * 60 * 1000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: BACKUP_REMINDER_ID,
          title: 'Pengingat Backup Data BMS',
          body: 'Saatnya mencadangkan data barbershop Anda agar tetap aman.',
          schedule: { at: fireAt },
        },
      ],
    });
  } catch {
    // Non-fatal on devices without notification permission
  }
}

