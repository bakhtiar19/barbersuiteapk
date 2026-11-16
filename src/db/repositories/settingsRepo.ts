import { query, withTransaction } from '@/db/client';
import { DEFAULT_SETTINGS } from '@/stores/settingsStore';
import type { AppSettings, SettingRow } from '@/types/domain';

export async function getSettingRows(): Promise<SettingRow[]> {
  return query<SettingRow>('SELECT key, value, updated_at FROM settings ORDER BY key ASC');
}

export async function getAllSettings(): Promise<AppSettings> {
  const rows = await getSettingRows();
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.key, row.value);
  }

  const weekStartRaw = map.get('week_start');
  const intervalRaw = Number.parseInt(map.get('backup_interval_days') ?? '7', 10);

  return {
    shop_name: map.get('shop_name') || DEFAULT_SETTINGS.shop_name,
    shop_address: map.get('shop_address') ?? DEFAULT_SETTINGS.shop_address,
    shop_phone: map.get('shop_phone') ?? DEFAULT_SETTINGS.shop_phone,
    shop_logo: map.get('shop_logo') ?? DEFAULT_SETTINGS.shop_logo,
    receipt_footer: map.get('receipt_footer') || DEFAULT_SETTINGS.receipt_footer,
    followup_template: map.get('followup_template') || DEFAULT_SETTINGS.followup_template,
    backup_interval_days: Number.isFinite(intervalRaw) && intervalRaw > 0 ? intervalRaw : 7,
    last_backup_at: map.get('last_backup_at') || null,
    week_start: weekStartRaw === '0' ? 0 : 1,
    pin_hash: map.get('pin_hash') ?? '',
    pin_salt: map.get('pin_salt') ?? '',
    currency: map.get('currency') || 'IDR',
    onboarding_completed: map.get('onboarding_completed') === '1',
    auto_backup_last_at: map.get('auto_backup_last_at') || null,
  };
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const now = new Date().toISOString();
  const entries: Array<[string, string]> = [];

  for (const [key, val] of Object.entries(partial)) {
    if (val === undefined) continue;
    if (key === 'onboarding_completed') {
      entries.push([key, val ? '1' : '0']);
    } else if (val === null) {
      entries.push([key, '']);
    } else {
      entries.push([key, String(val)]);
    }
  }

  if (entries.length > 0) {
    await withTransaction(async (tx) => {
      for (const [key, value] of entries) {
        await tx.execute(
          `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          [key, value, now],
        );
      }
    });
  }

  return getAllSettings();
}

