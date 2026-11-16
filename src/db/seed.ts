import { queryOne, withTransaction } from '@/db/client';
import { generateId } from '@/lib/id';

const DEFAULT_SERVICES = [
  { name: 'Haircut', price: 50000, duration_minutes: 30 },
  { name: 'Haircut + Wash', price: 65000, duration_minutes: 45 },
  { name: 'Haircut + Massage', price: 80000, duration_minutes: 60 },
  { name: 'Hair Coloring', price: 150000, duration_minutes: 90 },
];

const DEFAULT_SETTINGS_MAP: Record<string, string> = {
  shop_name: 'Barbershop Saya',
  shop_address: '',
  shop_phone: '',
  shop_logo: '',
  receipt_footer: 'Terima kasih, sampai jumpa lagi! ✂️',
  followup_template:
    'Halo {nama}, sudah {minggu} minggu sejak kunjungan terakhir. Yuk potong lagi di {toko}!',
  backup_interval_days: '7',
  last_backup_at: '',
  week_start: '1',
  pin_hash: '',
  pin_salt: '',
  currency: 'IDR',
  onboarding_completed: '0',
  auto_backup_last_at: '',
};

export async function seedInitialData(): Promise<void> {
  const existingSettings = await queryOne<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM settings');
  const existingServices = await queryOne<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM services');

  const now = new Date().toISOString();

  await withTransaction(async (tx) => {
    // Seed missing default settings keys idempotently
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS_MAP)) {
      await tx.execute(
        'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        [key, value, now],
      );
    }

    // Seed 4 sample services only on fresh empty DB
    if ((existingSettings?.cnt ?? 0) === 0 && (existingServices?.cnt ?? 0) === 0) {
      for (const svc of DEFAULT_SERVICES) {
        await tx.execute(
          `INSERT INTO services (id, name, price, duration_minutes, is_active, is_deleted, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, 0, ?, ?)`,
          [generateId(), svc.name, svc.price, svc.duration_minutes, now, now],
        );
      }
    }
  });
}

