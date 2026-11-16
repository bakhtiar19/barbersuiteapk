import { beforeEach, describe, expect, it } from 'vitest';
import { createBarber } from '@/db/repositories/barberRepo';
import { getReportSummary } from '@/db/repositories/reportQueries';
import { listServices } from '@/db/repositories/serviceRepo';
import { createTransactionAtomic, listTransactions } from '@/db/repositories/transactionRepo';
import {
  createBackupFileObject,
  parseAndValidateBackup,
  restoreFromBackup,
} from '@/features/backup/backupService';
import { setupFreshTestDb } from '@/tests/helpers/testDb';

describe('Backup & Restore (Release Gate)', () => {
  beforeEach(async () => {
    await setupFreshTestDb();
  });

  it('passes round-trip backup -> fresh DB -> restore with identical records and totals', async () => {
    const barber = await createBarber({ name: 'Reza' });
    const services = await listServices({ activeOnly: true });
    await createTransactionAtomic({
      customerName: 'Budi',
      customerPhone: '081122334455',
      barberId: barber.id,
      items: [{ serviceId: services[0].id, qty: 2 }],
      paymentMethod: 'transfer',
      trxDate: '2026-11-10',
    });

    const summaryBefore = await getReportSummary('2026-11-10', '2026-11-10');
    const backup = await createBackupFileObject();
    const rawJson = JSON.stringify(backup);

    // Wipe to completely fresh empty DB
    await setupFreshTestDb();
    expect(await listTransactions()).toHaveLength(0);

    const validated = await parseAndValidateBackup(rawJson);
    await restoreFromBackup(validated, { skipPreRestoreSnapshot: true });

    const summaryAfter = await getReportSummary('2026-11-10', '2026-11-10');
    expect(summaryAfter.totalRevenue).toBe(summaryBefore.totalRevenue);
    expect(summaryAfter.trxCount).toBe(summaryBefore.trxCount);
    expect(await listTransactions()).toHaveLength(1);
  });

  it('rejects corrupted backup checksums without modifying current DB', async () => {
    const barber = await createBarber({ name: 'Dimas' });
    const services = await listServices({ activeOnly: true });
    await createTransactionAtomic({
      customerName: 'Tono',
      barberId: barber.id,
      items: [{ serviceId: services[0].id, qty: 1 }],
      paymentMethod: 'cash',
      trxDate: '2026-11-10',
    });

    const backup = await createBackupFileObject();
    // Tamper with transaction total inside backup payload
    backup.data.transactions[0].total = 9999999;

    await expect(parseAndValidateBackup(JSON.stringify(backup))).rejects.toThrow(/Checksum/i);

    // Existing DB remains intact
    const current = await listTransactions();
    expect(current).toHaveLength(1);
    expect(current[0].total).toBe(services[0].price);
  });
});

