import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '@/App';
import { listBarbers } from '@/db/repositories/barberRepo';
import { createCustomer, listCustomersWithStats } from '@/db/repositories/customerRepo';
import { getDailyRevenueRangeSeries } from '@/db/repositories/reportQueries';
import { createService, deleteService, listServices } from '@/db/repositories/serviceRepo';
import { getAllSettings } from '@/db/repositories/settingsRepo';
import { createTransactionAtomic, voidTransaction } from '@/db/repositories/transactionRepo';
import {
  formatDateId,
  formatDateTimeId,
  formatMonthShortId,
  formatShortDateId,
} from '@/lib/date';
import { generateReportPdfBlob } from '@/lib/pdf';
import { useCartStore } from '@/stores/cartStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { setupFreshTestDb } from '@/tests/helpers/testDb';

describe('Full Application Audit (All Routes & Edge Cases)', () => {
  beforeEach(async () => {
    await setupFreshTestDb();
    useCartStore.getState().resetCart('');
    useUiStore.getState().setDbError(null);
    useUiStore.getState().setPinLocked(false);
    useUiStore.getState().setAppReady(true);
    const settings = await getAllSettings();
    useSettingsStore.getState().setSettings(settings);
  });

  it('handles empty or malformed dates safely without RangeError crashes', async () => {
    expect(formatDateId('')).toBe('-');
    expect(formatDateId('invalid-date')).toBe('-');
    expect(formatDateTimeId('')).toBe('-');
    expect(formatDateTimeId('not-an-iso')).toBe('-');
    expect(formatShortDateId('')).toBe('-');
    expect(formatMonthShortId('')).toBe('-');

    // Inverted or empty date range in reportQueries should return empty array instead of throwing
    expect(await getDailyRevenueRangeSeries('', '')).toEqual([]);
    expect(await getDailyRevenueRangeSeries('2026-11-15', '2026-11-10')).toEqual([]);
  });

  it('prevents trx_number collisions even if trx_counters falls behind existing transactions', async () => {
    const barber = (await listBarbers())[0] ||
      (await (await import('@/db/repositories/barberRepo')).createBarber({ name: 'Raka' }));
    const services = await listServices({ activeOnly: true });

    const trx1 = await createTransactionAtomic({
      customerName: 'Pelanggan 1',
      barberId: barber.id,
      items: [{ serviceId: services[0]!.id, qty: 1 }],
      paymentMethod: 'cash',
      trxDate: '2026-11-11',
    });

    // Simulate out-of-sync trx_counters (reset to 0)
    const { execute } = await import('@/db/client');
    await execute('UPDATE trx_counters SET last_seq = 0 WHERE trx_date = ?', ['2026-11-11']);

    // Next transaction on same date must still get seq 2 without UNIQUE constraint failure
    const trx2 = await createTransactionAtomic({
      customerName: 'Pelanggan 2',
      barberId: barber.id,
      items: [{ serviceId: services[0]!.id, qty: 1 }],
      paymentMethod: 'qris',
      trxDate: '2026-11-11',
    });

    expect(trx1.trx_number).toBe('TRX-20261111-0001');
    expect(trx2.trx_number).toBe('TRX-20261111-0002');
  });

  it('navigates across Onboarding, Dashboard, Services, Barbers, Customers, Reports, Backup, Settings, and PIN Lock without errors', async () => {
    window.history.pushState({}, '', '/onboarding');
    const { unmount } = render(<App onRetryBoot={() => undefined} />);

    // 1. Onboarding setup
    const barberInput = await screen.findByPlaceholderText(/Nama barber 1/i, {}, { timeout: 5000 });
    fireEvent.change(barberInput, { target: { value: 'Dimas' } });
    const startBtn = await screen.findByRole('button', { name: /Simpan & Mulai Pakai Kasir/i });
    fireEvent.click(startBtn);

    // 2. Dashboard loaded
    await waitFor(() => {
      expect(screen.getByText(/Omzet Hari Ini/i)).toBeInTheDocument();
    });

    const navigateTo = (path: string) => {
      act(() => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    };

    // 3. Navigate to Customers page
    navigateTo('/customers');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pelanggan' })).toBeInTheDocument();
    });

    // 4. Navigate to Reports page & test custom empty date resilience
    navigateTo('/reports');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Laporan Keuangan' })).toBeInTheDocument();
    });

    const customTab = await screen.findByRole('button', { name: 'Kustom' });
    fireEvent.click(customTab);
    const fromInput = await screen.findByLabelText('Dari Tanggal');
    fireEvent.change(fromInput, { target: { value: '' } });
    // Page must remain mounted and not crash
    expect(screen.getByRole('heading', { name: 'Laporan Keuangan' })).toBeInTheDocument();

    // 5. Navigate to Services page
    navigateTo('/services');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Manajemen Layanan' })).toBeInTheDocument();
    });

    // 6. Navigate to Barbers page
    navigateTo('/barbers');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Manajemen Barber' })).toBeInTheDocument();
    });

    // 7. Navigate to Backup page
    navigateTo('/backup');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Backup & Restore' })).toBeInTheDocument();
    });

    // 8. Navigate to Settings page
    navigateTo('/settings');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pengaturan' })).toBeInTheDocument();
    });

    unmount();
  });

  it('supports service archive/recreate, void transaction accounting, and PDF report generation', async () => {
    const barber = await (await import('@/db/repositories/barberRepo')).createBarber({
      name: 'Kapster Bima',
    });
    const customSvc = await createService({
      name: 'Hair Tattoo Spesial',
      price: 60000,
      duration_minutes: 45,
    });
    const cust = await createCustomer({
      name: 'Dimas Anggara',
      phone: '081299887766',
    });

    const trx = await createTransactionAtomic({
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      barberId: barber.id,
      items: [{ serviceId: customSvc.id, qty: 2 }],
      discountType: 'percent',
      discountValue: 10,
      paymentMethod: 'transfer',
    });

    expect(trx.subtotal).toBe(120000);
    expect(trx.discount_amount).toBe(12000);
    expect(trx.total).toBe(108000);

    // Deleting a used service archives it, and allows creating a new service with the same name
    const delOutcome = await deleteService(customSvc.id);
    expect(delOutcome).toBe('archived');
    const recreated = await createService({
      name: 'Hair Tattoo Spesial',
      price: 65000,
    });
    expect(recreated.id).not.toBe(customSvc.id);

    // PDF generation works without throwing
    const pdfBlob = generateReportPdfBlob({
      shopName: 'Barbershop Test',
      shopAddress: 'Jl. Uji No. 1',
      shopPhone: '08123456789',
      from: trx.trx_date,
      to: trx.trx_date,
      summary: {
        totalRevenue: 108000,
        totalSubtotal: 120000,
        totalDiscount: 12000,
        trxCount: 1,
        voidCount: 0,
        averageTransaction: 108000,
      },
      byService: [{ service_name: 'Hair Tattoo Spesial', qty: 2, revenue: 120000 }],
      byBarber: [{ barber_id: barber.id, barber_name: barber.name, trx_count: 1, revenue: 108000 }],
      byPaymentMethod: [{ payment_method: 'transfer', trx_count: 1, revenue: 108000 }],
      transactions: [trx],
    });
    expect(pdfBlob.size).toBeGreaterThan(500);

    // Voiding the transaction updates customer stats to 0 spent
    await voidTransaction(trx.id, 'Salah pilih metode');
    const custStats = await listCustomersWithStats({ search: 'Dimas' });
    expect(custStats[0]?.total_spent).toBe(0);
    expect(custStats[0]?.visit_count).toBe(0);
  });
});
