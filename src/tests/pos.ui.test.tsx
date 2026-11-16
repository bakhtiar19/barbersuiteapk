import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createBarber } from '@/db/repositories/barberRepo';
import { createService } from '@/db/repositories/serviceRepo';
import { listTransactions } from '@/db/repositories/transactionRepo';
import { PosPage } from '@/features/pos/PosPage';
import { PosSuccessPage } from '@/features/pos/PosSuccessPage';
import { useCartStore } from '@/stores/cartStore';
import { setupFreshTestDb } from '@/tests/helpers/testDb';

describe('Fast POS end-to-end flow', () => {
  beforeEach(async () => {
    await setupFreshTestDb();
    useCartStore.getState().resetCart('');
    await createBarber({ name: 'Dimas' });
    await createService({ name: 'Beard Trim', price: 25000 });
  });

  it('adds services by tap & search-enter, checks out, and shows success actions', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <Routes>
          <Route path="/pos" element={<PosPage />} />
          <Route path="/pos/success/:id" element={<PosSuccessPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Tap tile twice -> qty 2
    const haircut = await screen.findByRole('button', { name: 'Tambah Haircut' });
    await user.click(haircut);
    await user.click(haircut);

    // Search + Enter adds the first match
    const search = screen.getByLabelText('Cari layanan');
    await user.type(search, 'beard{Enter}');
    expect(search).toHaveValue('');

    // Remove one Haircut via tile minus
    await user.click(screen.getByRole('button', { name: 'Kurangi Haircut' }));

    await user.click(screen.getByRole('button', { name: /Lanjut Bayar/i }));

    await user.type(await screen.findByLabelText(/Nama Pelanggan/i), 'Andi');
    await user.type(screen.getByLabelText(/Nomor WhatsApp/i), '081234567890');
    await user.click(screen.getByRole('button', { name: /SIMPAN TRANSAKSI/i }));

    await waitFor(() => {
      expect(screen.getByText(/Transaksi Berhasil!/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /^Kirim Struk$/i })).toBeInTheDocument();

    const trxs = await listTransactions();
    expect(trxs).toHaveLength(1);
    expect(trxs[0].customer_name).toBe('Andi');
    expect(trxs[0].items).toHaveLength(2);
    expect(trxs[0].total).toBe(50000 + 25000);
  });
});
