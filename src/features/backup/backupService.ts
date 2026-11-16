import { Preferences } from '@capacitor/preferences';
import { z } from 'zod';
import { query, withTransaction } from '@/db/client';
import { CURRENT_SCHEMA_VERSION } from '@/db/migrations';
import { getAllSettings, updateSettings } from '@/db/repositories/settingsRepo';
import { listTransactions } from '@/db/repositories/transactionRepo';
import { sha256Hex } from '@/lib/crypto';
import { buildCsvWithBom } from '@/lib/csv';
import { formatBackupFilenameDate, formatDateTimeId, getDaysSince } from '@/lib/date';
import { generateId } from '@/lib/id';
import { PAYMENT_METHOD_LABELS } from '@/features/receipt/receiptService';
import { saveFile } from '@/platform/files';
import { scheduleBackupReminder } from '@/platform/notifications';
import type {
  AppSettings,
  AutoSnapshotEntry,
  BackupFile,
  BackupTableData,
  Barber,
  Customer,
  Service,
  SettingRow,
  Transaction,
  TransactionItem,
  TrxCounterRow,
} from '@/types/domain';

const AUTO_SNAPSHOTS_KEY = 'bms_auto_snapshots_v1';
const MAX_AUTO_SNAPSHOTS = 5;

const backupFileSchema = z.object({
  meta: z.object({
    app: z.literal('barbershop-bms'),
    appVersion: z.string(),
    schemaVersion: z.number().int().positive(),
    createdAt: z.string(),
    counts: z.object({
      settings: z.number().int().nonnegative(),
      services: z.number().int().nonnegative(),
      barbers: z.number().int().nonnegative(),
      customers: z.number().int().nonnegative(),
      transactions: z.number().int().nonnegative(),
      transaction_items: z.number().int().nonnegative(),
      trx_counters: z.number().int().nonnegative(),
    }),
    checksum: z.string().min(32),
  }),
  data: z.object({
    settings: z.array(z.any()),
    services: z.array(z.any()),
    barbers: z.array(z.any()),
    customers: z.array(z.any()),
    transactions: z.array(z.any()),
    transaction_items: z.array(z.any()),
    trx_counters: z.array(z.any()),
  }),
});

function canonicalizeBackupData(data: BackupTableData): string {
  return JSON.stringify({
    settings: data.settings,
    services: data.services,
    barbers: data.barbers,
    customers: data.customers,
    transactions: data.transactions,
    transaction_items: data.transaction_items,
    trx_counters: data.trx_counters,
  });
}

async function readAllTables(): Promise<BackupTableData> {
  const [settings, services, barbers, customers, transactions, transaction_items, trx_counters] =
    await Promise.all([
      query<SettingRow>('SELECT key, value, updated_at FROM settings ORDER BY key ASC'),
      query<Service>('SELECT * FROM services ORDER BY created_at ASC, id ASC'),
      query<Barber>('SELECT * FROM barbers ORDER BY created_at ASC, id ASC'),
      query<Customer>('SELECT * FROM customers ORDER BY created_at ASC, id ASC'),
      query<Transaction>('SELECT * FROM transactions ORDER BY created_at ASC, id ASC'),
      query<TransactionItem>('SELECT * FROM transaction_items ORDER BY transaction_id ASC, id ASC'),
      query<TrxCounterRow>('SELECT trx_date, last_seq FROM trx_counters ORDER BY trx_date ASC'),
    ]);

  return {
    settings,
    services,
    barbers,
    customers,
    transactions,
    transaction_items,
    trx_counters,
  };
}

export async function createBackupFileObject(): Promise<BackupFile> {
  const data = await readAllTables();
  const checksum = await sha256Hex(canonicalizeBackupData(data));

  return {
    meta: {
      app: 'barbershop-bms',
      appVersion: '4.2.0',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      counts: {
        settings: data.settings.length,
        services: data.services.length,
        barbers: data.barbers.length,
        customers: data.customers.length,
        transactions: data.transactions.length,
        transaction_items: data.transaction_items.length,
        trx_counters: data.trx_counters.length,
      },
      checksum,
    },
    data,
  };
}

export async function exportBackupToFile(
  shareAfterSave = false,
): Promise<{ filename: string; backup: BackupFile; shared: boolean }> {
  const now = new Date();
  const nowIso = now.toISOString();

  // Persist last_backup_at before generating dump so backup reflects timestamp cleanly
  const currentSettings = await getAllSettings();
  await updateSettings({ last_backup_at: nowIso });
  await scheduleBackupReminder(currentSettings.backup_interval_days);

  const backup = await createBackupFileObject();
  const filename = `bms-backup-${formatBackupFilenameDate(now)}.bms`;
  const payload = JSON.stringify(backup, null, 2);

  const res = await saveFile({
    filename,
    content: payload,
    mimeType: 'application/json',
    shareAfterSave,
    shareTitle: `Backup ${currentSettings.shop_name}`,
    shareText: `File backup data Barbershop BMS (${backup.meta.counts.transactions} transaksi).`,
  });

  return { filename, backup, shared: res.shared };
}

function migrateBackupDataIfNeeded(backup: BackupFile): BackupFile {
  if (backup.meta.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Versi skema backup (${backup.meta.schemaVersion}) lebih baru dari aplikasi ini (${CURRENT_SCHEMA_VERSION}). Harap perbarui aplikasi terlebih dahulu.`,
    );
  }
  // Future migrations from older backup schemaVersion -> CURRENT_SCHEMA_VERSION go here
  return backup;
}

export async function parseAndValidateBackup(rawText: string): Promise<BackupFile> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new Error('File tidak dapat dibaca. Pastikan Anda memilih file backup .bms yang valid.');
  }

  const result = backupFileSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error('Struktur file backup .bms tidak valid atau tidak lengkap.');
  }

  const backup = result.data as BackupFile;
  const expectedChecksum = await sha256Hex(canonicalizeBackupData(backup.data));
  if (expectedChecksum !== backup.meta.checksum) {
    throw new Error(
      'Checksum file backup tidak cocok (file korup atau telah diubah). Restore dibatalkan demi keamanan data.',
    );
  }

  return migrateBackupDataIfNeeded(backup);
}

export async function listAutoSnapshots(): Promise<AutoSnapshotEntry[]> {
  try {
    const { value } = await Preferences.get({ key: AUTO_SNAPSHOTS_KEY });
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as AutoSnapshotEntry[]) : [];
  } catch {
    return [];
  }
}

export async function saveAutoSnapshot(reason: 'auto' | 'pre-restore'): Promise<AutoSnapshotEntry> {
  const backup = await createBackupFileObject();
  const entry: AutoSnapshotEntry = {
    id: generateId(),
    reason,
    createdAt: backup.meta.createdAt,
    trxCount: backup.meta.counts.transactions,
    customerCount: backup.meta.counts.customers,
    payload: JSON.stringify(backup),
  };

  const existing = await listAutoSnapshots();
  const updated = [entry, ...existing].slice(0, MAX_AUTO_SNAPSHOTS);
  await Preferences.set({
    key: AUTO_SNAPSHOTS_KEY,
    value: JSON.stringify(updated),
  });

  return entry;
}

export async function restoreFromBackup(
  backup: BackupFile,
  options?: { skipPreRestoreSnapshot?: boolean },
): Promise<void> {
  const migrated = migrateBackupDataIfNeeded(backup);

  if (!options?.skipPreRestoreSnapshot) {
    await saveAutoSnapshot('pre-restore');
  }

  const { data } = migrated;

  await withTransaction(async (tx) => {
    // Clear existing data in reverse foreign-key order
    await tx.execute('DELETE FROM transaction_items');
    await tx.execute('DELETE FROM transactions');
    await tx.execute('DELETE FROM trx_counters');
    await tx.execute('DELETE FROM customers');
    await tx.execute('DELETE FROM barbers');
    await tx.execute('DELETE FROM services');
    await tx.execute('DELETE FROM settings');

    for (const row of data.settings) {
      await tx.execute('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [
        row.key,
        row.value,
        row.updated_at,
      ]);
    }

    for (const row of data.services) {
      await tx.execute(
        `INSERT INTO services (id, name, price, duration_minutes, is_active, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.name,
          row.price,
          row.duration_minutes ?? null,
          row.is_active,
          row.is_deleted,
          row.created_at,
          row.updated_at,
        ],
      );
    }

    for (const row of data.barbers) {
      await tx.execute(
        `INSERT INTO barbers (id, name, phone, is_active, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.name,
          row.phone ?? null,
          row.is_active,
          row.is_deleted,
          row.created_at,
          row.updated_at,
        ],
      );
    }

    for (const row of data.customers) {
      await tx.execute(
        `INSERT INTO customers (id, name, phone, notes, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.name,
          row.phone ?? null,
          row.notes ?? null,
          row.is_deleted,
          row.created_at,
          row.updated_at,
        ],
      );
    }

    for (const row of data.transactions) {
      await tx.execute(
        `INSERT INTO transactions (
          id, trx_number, trx_date, created_at,
          customer_id, customer_name, customer_phone,
          barber_id, barber_name,
          subtotal, discount_type, discount_value, discount_amount, total,
          payment_method, notes, status, void_reason, voided_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.trx_number,
          row.trx_date,
          row.created_at,
          row.customer_id ?? null,
          row.customer_name,
          row.customer_phone ?? null,
          row.barber_id,
          row.barber_name,
          row.subtotal,
          row.discount_type ?? null,
          row.discount_value,
          row.discount_amount,
          row.total,
          row.payment_method,
          row.notes ?? null,
          row.status,
          row.void_reason ?? null,
          row.voided_at ?? null,
        ],
      );
    }

    for (const row of data.transaction_items) {
      await tx.execute(
        `INSERT INTO transaction_items (
          id, transaction_id, service_id, service_name, unit_price, qty, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.transaction_id,
          row.service_id ?? null,
          row.service_name,
          row.unit_price,
          row.qty,
          row.line_total,
        ],
      );
    }

    for (const row of data.trx_counters) {
      await tx.execute('INSERT INTO trx_counters (trx_date, last_seq) VALUES (?, ?)', [
        row.trx_date,
        row.last_seq,
      ]);
    }
  });
}

export interface BackupReminderStatus {
  isOverdue: boolean;
  isCritical: boolean;
  daysSinceLastBackup: number | null;
  hasNeverBackedUp: boolean;
}

export function getBackupReminderStatus(settings: AppSettings): BackupReminderStatus {
  const interval = Math.max(1, settings.backup_interval_days || 7);
  if (!settings.last_backup_at) {
    return {
      isOverdue: settings.onboarding_completed,
      isCritical: false,
      daysSinceLastBackup: null,
      hasNeverBackedUp: true,
    };
  }
  const days = getDaysSince(settings.last_backup_at) ?? 0;
  return {
    isOverdue: days >= interval,
    isCritical: days > interval * 2,
    daysSinceLastBackup: days,
    hasNeverBackedUp: false,
  };
}

export async function checkAndRunAutoBackupOnBoot(settings: AppSettings): Promise<void> {
  if (!settings.onboarding_completed) return;
  const interval = Math.max(1, settings.backup_interval_days || 7);
  const lastAutoDays = settings.auto_backup_last_at
    ? getDaysSince(settings.auto_backup_last_at)
    : null;

  const shouldCreateAuto =
    lastAutoDays === null || lastAutoDays >= interval;

  if (!shouldCreateAuto) return;

  const trxCountRow = await query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM transactions');
  if ((trxCountRow[0]?.cnt ?? 0) === 0) return;

  await saveAutoSnapshot('auto');
  await updateSettings({ auto_backup_last_at: new Date().toISOString() });
}

export async function exportTransactionsCsv(
  from?: string,
  to?: string,
): Promise<{ filename: string; count: number }> {
  const transactions = await listTransactions({
    from,
    to,
    status: 'all',
    limit: 50000,
    offset: 0,
  });

  const headers = [
    'No Transaksi',
    'Tanggal',
    'Waktu',
    'Status',
    'Pelanggan',
    'WhatsApp',
    'Barber',
    'Layanan',
    'Qty',
    'Harga Satuan',
    'Total Item',
    'Subtotal Transaksi',
    'Diskon Transaksi',
    'Total Transaksi',
    'Metode Bayar',
    'Catatan',
    'Alasan Void',
  ];

  const rows: Array<Array<string | number | null>> = [];
  for (const trx of transactions) {
    if (trx.items.length === 0) {
      rows.push([
        trx.trx_number,
        trx.trx_date,
        formatDateTimeId(trx.created_at),
        trx.status,
        trx.customer_name,
        trx.customer_phone ?? '',
        trx.barber_name,
        '',
        0,
        0,
        0,
        trx.subtotal,
        trx.discount_amount,
        trx.total,
        PAYMENT_METHOD_LABELS[trx.payment_method] ?? trx.payment_method,
        trx.notes ?? '',
        trx.void_reason ?? '',
      ]);
      continue;
    }

    for (const item of trx.items) {
      rows.push([
        trx.trx_number,
        trx.trx_date,
        formatDateTimeId(trx.created_at),
        trx.status,
        trx.customer_name,
        trx.customer_phone ?? '',
        trx.barber_name,
        item.service_name,
        item.qty,
        item.unit_price,
        item.line_total,
        trx.subtotal,
        trx.discount_amount,
        trx.total,
        PAYMENT_METHOD_LABELS[trx.payment_method] ?? trx.payment_method,
        trx.notes ?? '',
        trx.void_reason ?? '',
      ]);
    }
  }

  const csvContent = buildCsvWithBom(headers, rows);
  const rangeTag = from && to ? `${from}_sd_${to}` : formatBackupFilenameDate();
  const filename = `bms-transaksi-${rangeTag}.csv`;

  await saveFile({
    filename,
    content: csvContent,
    mimeType: 'text/csv;charset=utf-8',
  });

  return { filename, count: transactions.length };
}

