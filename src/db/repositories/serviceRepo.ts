import { execute, query, queryOne } from '@/db/client';
import { generateId } from '@/lib/id';
import type { Service } from '@/types/domain';

export async function listServices(options?: { activeOnly?: boolean }): Promise<Service[]> {
  const activeClause = options?.activeOnly ? 'AND is_active = 1' : '';
  return query<Service>(
    `SELECT * FROM services WHERE is_deleted = 0 ${activeClause} ORDER BY is_active DESC, name COLLATE NOCASE ASC`,
  );
}

export interface ServiceWithUsage extends Service {
  usage_count: number;
}

/** Active services ordered by popularity (completed transactions), for the fast cashier grid. */
export async function listServicesWithUsage(): Promise<ServiceWithUsage[]> {
  return query<ServiceWithUsage>(
    `SELECT s.*, COALESCE(u.cnt, 0) AS usage_count
     FROM services s
     LEFT JOIN (
       SELECT i.service_id, SUM(i.qty) AS cnt
       FROM transaction_items i
       JOIN transactions t ON t.id = i.transaction_id
       WHERE t.status = 'completed'
       GROUP BY i.service_id
     ) u ON u.service_id = s.id
     WHERE s.is_deleted = 0 AND s.is_active = 1
     ORDER BY usage_count DESC, s.name COLLATE NOCASE ASC`,
  );
}

export async function getServiceById(id: string): Promise<Service | null> {
  return queryOne<Service>('SELECT * FROM services WHERE id = ? AND is_deleted = 0', [id]);
}

export async function createService(input: {
  name: string;
  price: number;
  duration_minutes?: number | null;
  is_active?: boolean;
}): Promise<Service> {
  const name = input.name.trim();
  const duplicate = await queryOne<{ id: string }>(
    'SELECT id FROM services WHERE LOWER(name) = LOWER(?) AND is_deleted = 0',
    [name],
  );
  if (duplicate) {
    throw new Error(`Layanan "${name}" sudah ada.`);
  }

  const now = new Date().toISOString();
  const id = generateId();
  const price = Math.max(0, Math.round(input.price));
  const duration =
    input.duration_minutes && input.duration_minutes > 0
      ? Math.round(input.duration_minutes)
      : null;
  const isActive = input.is_active === false ? 0 : 1;

  await execute(
    `INSERT INTO services (id, name, price, duration_minutes, is_active, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, name, price, duration, isActive, now, now],
  );

  const created = await getServiceById(id);
  if (!created) throw new Error('Gagal menyimpan layanan.');
  return created;
}

export async function updateService(
  id: string,
  input: {
    name: string;
    price: number;
    duration_minutes?: number | null;
    is_active: boolean;
  },
): Promise<Service> {
  const name = input.name.trim();
  const duplicate = await queryOne<{ id: string }>(
    'SELECT id FROM services WHERE LOWER(name) = LOWER(?) AND is_deleted = 0 AND id != ?',
    [name, id],
  );
  if (duplicate) {
    throw new Error(`Layanan "${name}" sudah digunakan.`);
  }

  const now = new Date().toISOString();
  const price = Math.max(0, Math.round(input.price));
  const duration =
    input.duration_minutes && input.duration_minutes > 0
      ? Math.round(input.duration_minutes)
      : null;

  await execute(
    `UPDATE services
     SET name = ?, price = ?, duration_minutes = ?, is_active = ?, updated_at = ?
     WHERE id = ? AND is_deleted = 0`,
    [name, price, duration, input.is_active ? 1 : 0, now, id],
  );

  const updated = await getServiceById(id);
  if (!updated) throw new Error('Layanan tidak ditemukan.');
  return updated;
}

export async function toggleServiceActive(id: string, isActive: boolean): Promise<void> {
  await execute('UPDATE services SET is_active = ?, updated_at = ? WHERE id = ? AND is_deleted = 0', [
    isActive ? 1 : 0,
    new Date().toISOString(),
    id,
  ]);
}

export async function deleteService(id: string): Promise<'deleted' | 'archived'> {
  const usage = await queryOne<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM transaction_items WHERE service_id = ?',
    [id],
  );

  if ((usage?.cnt ?? 0) > 0) {
    await execute(
      'UPDATE services SET is_deleted = 1, is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
    return 'archived';
  }

  await execute('DELETE FROM services WHERE id = ?', [id]);
  return 'deleted';
}

