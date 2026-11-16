import { beforeEach, describe, expect, it } from 'vitest';
import { createBarber, deleteBarber } from '@/db/repositories/barberRepo';
import {
  getCustomerById,
  getCustomerFavoriteService,
  listCustomersWithStats,
} from '@/db/repositories/customerRepo';
import {
  getDashboardStats,
  getReportSummary,
  getRevenueByBarber,
  getRevenueByService,
} from '@/db/repositories/reportQueries';
import { createService, deleteService, listServices, updateService } from '@/db/repositories/serviceRepo';
import {
  createTransactionAtomic,
  listTransactions,
  voidTransaction,
} from '@/db/repositories/transactionRepo';
import { setupFreshTestDb } from '@/tests/helpers/testDb';

describe('SQLite repositories integration', () => {
  beforeEach(async () => {
    await setupFreshTestDb();
  });

  it('seeds 4 initial services and allows CRUD + archive semantics', async () => {
    const initial = await listServices();
    expect(initial).toHaveLength(4);
    expect(initial.map((s) => s.name)).toContain('Haircut');

    const extra = await createService({ name: 'Beard Trim', price: 25000, duration_minutes: 15 });
    expect(extra.price).toBe(25000);
    expect(await deleteService(extra.id)).toBe('deleted');
  });

  it('creates transactions atomically with sequential numbering, snapshots, and dashboard/report parity', async () => {
    const barber = await createBarber({ name: 'Dimas', phone: '081200001111' });
    const services = await listServices({ activeOnly: true });
    const haircut = services.find((s) => s.name === 'Haircut')!;
    const wash = services.find((s) => s.name === 'Haircut + Wash')!;

    const trx1 = await createTransactionAtomic({
      customerName: 'Andi',
      customerPhone: '081234567890',
      barberId: barber.id,
      items: [{ serviceId: haircut.id, qty: 1 }],
      discountType: 'amount',
      discountValue: 5000,
      paymentMethod: 'cash',
      trxDate: '2026-11-10',
    });

    const trx2 = await createTransactionAtomic({
      customerName: 'Andi Repeat',
      customerPhone: '+6281234567890', // same normalized phone -> reuses Andi
      barberId: barber.id,
      items: [{ serviceId: wash.id, qty: 1 }],
      paymentMethod: 'qris',
      trxDate: '2026-11-10',
    });

    expect(trx1.trx_number).toBe('TRX-20261110-0001');
    expect(trx2.trx_number).toBe('TRX-20261110-0002');
    expect(trx1.total).toBe(45000);
    expect(trx2.customer_id).toBe(trx1.customer_id);

    // Price edit does NOT mutate historical snapshot
    await updateService(haircut.id, {
      name: haircut.name,
      price: 75000,
      duration_minutes: 30,
      is_active: true,
    });

    const savedList = await listTransactions({ from: '2026-11-10', to: '2026-11-10' });
    expect(savedList.find((t) => t.id === trx1.id)?.items[0]?.unit_price).toBe(50000);

    // Deleting used service/barber archives instead of failing FK
    expect(await deleteService(haircut.id)).toBe('archived');
    expect(await deleteBarber(barber.id)).toBe('archived');

    // Dashboard == Report for same day
    const dash = await getDashboardStats('2026-11-10');
    const summary = await getReportSummary('2026-11-10', '2026-11-10');
    expect(dash.todayRevenue).toBe(summary.totalRevenue);
    expect(dash.todayRevenue).toBe(45000 + 65000);
    expect(dash.todayTrxCount).toBe(2);

    const bySvc = await getRevenueByService('2026-11-10', '2026-11-10');
    const byBarber = await getRevenueByBarber('2026-11-10', '2026-11-10');
    expect(bySvc).toHaveLength(2);
    expect(byBarber[0]?.revenue).toBe(110000);

    // Voiding transaction immediately removes from revenue
    await voidTransaction(trx2.id, 'Salah input');
    const dashAfterVoid = await getDashboardStats('2026-11-10');
    const summaryAfterVoid = await getReportSummary('2026-11-10', '2026-11-10');
    expect(dashAfterVoid.todayRevenue).toBe(45000);
    expect(summaryAfterVoid.totalRevenue).toBe(45000);
    expect(summaryAfterVoid.voidCount).toBe(1);

    // Customer stats reflect non-void transactions only
    const customer = await getCustomerById(trx1.customer_id!);
    expect(customer?.visit_count).toBe(1);
    expect(customer?.total_spent).toBe(45000);
    const fav = await getCustomerFavoriteService(trx1.customer_id!);
    expect(fav?.service_name).toBe('Haircut');
    expect(await listCustomersWithStats()).toHaveLength(1);
  });
});

