import { execute, query, queryOne, type DbExecutor } from '@/db/client';
import { generateId } from '@/lib/id';
import { normalizePhone } from '@/lib/phone';
import type { Customer, CustomerWithStats } from '@/types/domain';

export type CustomerSortBy = 'last_visit' | 'total_spent' | 'name';

export async function listCustomersWithStats(options?: {
  search?: string;
  sort?: CustomerSortBy;
  inactiveOverDays?: number;
}): Promise<CustomerWithStats[]> {
  const search = options?.search?.trim();
  const params: unknown[] = [];
  const whereClauses: string[] = ['c.is_deleted = 0'];

  if (search) {
    const normalizedSearchPhone = normalizePhone(search);
    if (normalizedSearchPhone) {
      whereClauses.push('(c.name LIKE ? OR c.phone LIKE ? OR c.phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${normalizedSearchPhone}%`);
    } else {
      whereClauses.push('(c.name LIKE ? OR c.phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
  }

  let havingClause = '';
  if (options?.inactiveOverDays && options.inactiveOverDays > 0) {
    const cutoff = new Date(
      Date.now() - options.inactiveOverDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    havingClause = 'HAVING last_visit IS NOT NULL AND last_visit < ?';
    params.push(cutoff);
  }

  let orderClause = 'ORDER BY COALESCE(last_visit, c.created_at) DESC, c.name COLLATE NOCASE ASC';
  if (options?.sort === 'total_spent') {
    orderClause = 'ORDER BY total_spent DESC, visit_count DESC, c.name COLLATE NOCASE ASC';
  } else if (options?.sort === 'name') {
    orderClause = 'ORDER BY c.name COLLATE NOCASE ASC';
  }

  return query<CustomerWithStats>(
    `SELECT c.*,
            COUNT(t.id) AS visit_count,
            COALESCE(SUM(t.total), 0) AS total_spent,
            MAX(t.created_at) AS last_visit
     FROM customers c
     LEFT JOIN transactions t
       ON t.customer_id = c.id
      AND t.status = 'completed'
     WHERE ${whereClauses.join(' AND ')}
     GROUP BY c.id
     ${havingClause}
     ${orderClause}`,
    params,
  );
}

export async function searchCustomers(term: string, limit = 8): Promise<Customer[]> {
  const q = term.trim();
  if (!q) {
    return query<Customer>(
      'SELECT * FROM customers WHERE is_deleted = 0 ORDER BY updated_at DESC LIMIT ?',
      [limit],
    );
  }
  const normalizedPhone = normalizePhone(q);
  if (normalizedPhone) {
    return query<Customer>(
      `SELECT * FROM customers
       WHERE is_deleted = 0 AND (name LIKE ? OR phone LIKE ? OR phone LIKE ?)
       ORDER BY name COLLATE NOCASE ASC LIMIT ?`,
      [`%${q}%`, `%${q}%`, `%${normalizedPhone}%`, limit],
    );
  }
  return query<Customer>(
    `SELECT * FROM customers
     WHERE is_deleted = 0 AND (name LIKE ? OR phone LIKE ?)
     ORDER BY name COLLATE NOCASE ASC LIMIT ?`,
    [`%${q}%`, `%${q}%`, limit],
  );
}

export async function getCustomerById(id: string): Promise<CustomerWithStats | null> {
  return queryOne<CustomerWithStats>(
    `SELECT c.*,
            COUNT(t.id) AS visit_count,
            COALESCE(SUM(t.total), 0) AS total_spent,
            MAX(t.created_at) AS last_visit
     FROM customers c
     LEFT JOIN transactions t
       ON t.customer_id = c.id
      AND t.status = 'completed'
     WHERE c.id = ? AND c.is_deleted = 0
     GROUP BY c.id`,
    [id],
  );
}

export async function getCustomerFavoriteService(
  customerId: string,
): Promise<{ service_name: string; count: number } | null> {
  return queryOne<{ service_name: string; count: number }>(
    `SELECT i.service_name, SUM(i.qty) AS count
     FROM transaction_items i
     JOIN transactions t ON t.id = i.transaction_id
     WHERE t.customer_id = ? AND t.status = 'completed'
     GROUP BY i.service_name
     ORDER BY count DESC
     LIMIT 1`,
    [customerId],
  );
}

export async function createCustomer(input: {
  name: string;
  phone?: string | null;
  notes?: string | null;
}): Promise<Customer> {
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  if (phone) {
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM customers WHERE phone = ? AND is_deleted = 0',
      [phone],
    );
    if (existing) {
      throw new Error(`Nomor WhatsApp ${phone} sudah terdaftar pada pelanggan lain.`);
    }
  }

  const now = new Date().toISOString();
  const id = generateId();
  const notes = input.notes?.trim() || null;

  await execute(
    `INSERT INTO customers (id, name, phone, notes, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [id, name, phone, notes, now, now],
  );

  const created = await queryOne<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
  if (!created) throw new Error('Gagal menyimpan pelanggan.');
  return created;
}

export async function updateCustomer(
  id: string,
  input: {
    name: string;
    phone?: string | null;
    notes?: string | null;
  },
): Promise<Customer> {
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);

  if (phone) {
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM customers WHERE phone = ? AND is_deleted = 0 AND id != ?',
      [phone, id],
    );
    if (existing) {
      throw new Error(`Nomor WhatsApp ${phone} sudah terdaftar pada pelanggan lain.`);
    }
  }

  const now = new Date().toISOString();
  const notes = input.notes?.trim() || null;

  await execute(
    `UPDATE customers
     SET name = ?, phone = ?, notes = ?, updated_at = ?
     WHERE id = ? AND is_deleted = 0`,
    [name, phone, notes, now, id],
  );

  const updated = await queryOne<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
  if (!updated) throw new Error('Pelanggan tidak ditemukan.');
  return updated;
}

export async function updateCustomerNotes(id: string, notes: string | null): Promise<void> {
  await execute('UPDATE customers SET notes = ?, updated_at = ? WHERE id = ? AND is_deleted = 0', [
    notes?.trim() || null,
    new Date().toISOString(),
    id,
  ]);
}

export async function deleteCustomer(id: string): Promise<'deleted' | 'archived'> {
  const usage = await queryOne<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM transactions WHERE customer_id = ?',
    [id],
  );

  if ((usage?.cnt ?? 0) > 0) {
    await execute('UPDATE customers SET is_deleted = 1, updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      id,
    ]);
    return 'archived';
  }

  await execute('DELETE FROM customers WHERE id = ?', [id]);
  return 'deleted';
}

export async function upsertCustomerInTx(
  tx: DbExecutor,
  input: {
    customerId?: string | null;
    name: string;
    phone?: string | null;
  },
): Promise<{ id: string; name: string; phone: string | null }> {
  const cleanName = input.name.trim();
  const normalizedPhone = normalizePhone(input.phone);
  const now = new Date().toISOString();

  // 1. If explicit customerId selected, update phone if user entered a new phone (and not taken)
  if (input.customerId) {
    const existing = await tx.queryOne<Customer>(
      'SELECT * FROM customers WHERE id = ? AND is_deleted = 0',
      [input.customerId],
    );
    if (existing) {
      let nextPhone = existing.phone;
      if (normalizedPhone && normalizedPhone !== existing.phone) {
        const collision = await tx.queryOne<{ id: string }>(
          'SELECT id FROM customers WHERE phone = ? AND is_deleted = 0 AND id != ?',
          [normalizedPhone, existing.id],
        );
        if (!collision) {
          nextPhone = normalizedPhone;
          await tx.execute('UPDATE customers SET phone = ?, updated_at = ? WHERE id = ?', [
            nextPhone,
            now,
            existing.id,
          ]);
        }
      } else {
        await tx.execute('UPDATE customers SET updated_at = ? WHERE id = ?', [now, existing.id]);
      }
      return { id: existing.id, name: existing.name, phone: nextPhone };
    }
  }

  // 2. Match existing active customer by unique phone
  if (normalizedPhone) {
    const byPhone = await tx.queryOne<Customer>(
      'SELECT * FROM customers WHERE phone = ? AND is_deleted = 0',
      [normalizedPhone],
    );
    if (byPhone) {
      await tx.execute('UPDATE customers SET updated_at = ? WHERE id = ?', [now, byPhone.id]);
      return { id: byPhone.id, name: byPhone.name, phone: byPhone.phone };
    }
  } else {
    // If no phone was typed, reuse existing active customer with the exact same name who already has a phone
    const byName = await tx.queryOne<Customer>(
      `SELECT * FROM customers
       WHERE is_deleted = 0 AND LOWER(name) = LOWER(?) AND phone IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`,
      [cleanName],
    );
    if (byName) {
      await tx.execute('UPDATE customers SET updated_at = ? WHERE id = ?', [now, byName.id]);
      return { id: byName.id, name: byName.name, phone: byName.phone };
    }
  }

  // 3. Create new customer
  const newId = generateId();
  await tx.execute(
    `INSERT INTO customers (id, name, phone, notes, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, NULL, 0, ?, ?)`,
    [newId, cleanName, normalizedPhone, now, now],
  );
  return { id: newId, name: cleanName, phone: normalizedPhone };
}
