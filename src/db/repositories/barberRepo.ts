import { execute, query, queryOne } from '@/db/client';
import { generateId } from '@/lib/id';
import { normalizePhone } from '@/lib/phone';
import type { Barber, BarberWithStats } from '@/types/domain';

export async function listBarbers(options?: { activeOnly?: boolean }): Promise<Barber[]> {
  const activeClause = options?.activeOnly ? 'AND is_active = 1' : '';
  return query<Barber>(
    `SELECT * FROM barbers WHERE is_deleted = 0 ${activeClause} ORDER BY is_active DESC, name COLLATE NOCASE ASC`,
  );
}

export async function listBarbersWithStats(from?: string, to?: string): Promise<BarberWithStats[]> {
  const dateFilter = from && to ? 'AND t.trx_date BETWEEN ? AND ?' : '';
  const params = from && to ? [from, to] : [];

  return query<BarberWithStats>(
    `SELECT b.*,
            COUNT(t.id) AS trx_count,
            COUNT(DISTINCT t.customer_id) AS unique_customers,
            COALESCE(SUM(t.total), 0) AS total_revenue
     FROM barbers b
     LEFT JOIN transactions t
       ON t.barber_id = b.id
      AND t.status = 'completed'
      ${dateFilter}
     WHERE b.is_deleted = 0
     GROUP BY b.id
     ORDER BY b.is_active DESC, total_revenue DESC, b.name COLLATE NOCASE ASC`,
    params,
  );
}

export async function getBarberById(id: string): Promise<Barber | null> {
  return queryOne<Barber>('SELECT * FROM barbers WHERE id = ? AND is_deleted = 0', [id]);
}

export async function getBarberDetailStats(
  barberId: string,
  from?: string,
  to?: string,
): Promise<{ trxCount: number; uniqueCustomers: number; totalRevenue: number }> {
  const dateFilter = from && to ? 'AND trx_date BETWEEN ? AND ?' : '';
  const params = from && to ? [barberId, from, to] : [barberId];

  const row = await queryOne<{
    trx_count: number;
    unique_customers: number;
    total_revenue: number;
  }>(
    `SELECT COUNT(*) AS trx_count,
            COUNT(DISTINCT customer_id) AS unique_customers,
            COALESCE(SUM(total), 0) AS total_revenue
     FROM transactions
     WHERE barber_id = ? AND status = 'completed' ${dateFilter}`,
    params,
  );

  return {
    trxCount: row?.trx_count ?? 0,
    uniqueCustomers: row?.unique_customers ?? 0,
    totalRevenue: row?.total_revenue ?? 0,
  };
}

export async function createBarber(input: {
  name: string;
  phone?: string | null;
  is_active?: boolean;
}): Promise<Barber> {
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  const now = new Date().toISOString();
  const id = generateId();

  await execute(
    `INSERT INTO barbers (id, name, phone, is_active, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [id, name, phone, input.is_active === false ? 0 : 1, now, now],
  );

  const created = await getBarberById(id);
  if (!created) throw new Error('Gagal menyimpan barber.');
  return created;
}

export async function updateBarber(
  id: string,
  input: {
    name: string;
    phone?: string | null;
    is_active: boolean;
  },
): Promise<Barber> {
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  const now = new Date().toISOString();

  await execute(
    `UPDATE barbers
     SET name = ?, phone = ?, is_active = ?, updated_at = ?
     WHERE id = ? AND is_deleted = 0`,
    [name, phone, input.is_active ? 1 : 0, now, id],
  );

  const updated = await getBarberById(id);
  if (!updated) throw new Error('Barber tidak ditemukan.');
  return updated;
}

export async function toggleBarberActive(id: string, isActive: boolean): Promise<void> {
  await execute('UPDATE barbers SET is_active = ?, updated_at = ? WHERE id = ? AND is_deleted = 0', [
    isActive ? 1 : 0,
    new Date().toISOString(),
    id,
  ]);
}

export async function deleteBarber(id: string): Promise<'deleted' | 'archived'> {
  const usage = await queryOne<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM transactions WHERE barber_id = ?',
    [id],
  );

  if ((usage?.cnt ?? 0) > 0) {
    await execute(
      'UPDATE barbers SET is_deleted = 1, is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
    return 'archived';
  }

  await execute('DELETE FROM barbers WHERE id = ?', [id]);
  return 'deleted';
}

