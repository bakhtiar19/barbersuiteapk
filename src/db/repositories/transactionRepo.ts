import { execute, query, queryOne, withTransaction } from '@/db/client';
import { upsertCustomerInTx } from '@/db/repositories/customerRepo';
import { getLocalDateString } from '@/lib/date';
import { formatTrxNumber, generateId } from '@/lib/id';
import { calculateDiscountAmount } from '@/lib/money';
import { normalizePhone } from '@/lib/phone';
import type {
  Barber,
  DiscountType,
  PaymentMethod,
  Service,
  Transaction,
  TransactionItem,
  TransactionWithItems,
} from '@/types/domain';

export interface CreateTransactionItemInput {
  serviceId: string;
  qty: number;
}

export interface CreateTransactionInput {
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  barberId: string;
  items: CreateTransactionItemInput[];
  discountType?: DiscountType | null;
  discountValue?: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  trxDate?: string;
}

export async function previewNextTrxNumber(trxDate: string = getLocalDateString()): Promise<string> {
  const [counterRow, existingCountRow] = await Promise.all([
    queryOne<{ last_seq: number }>(
      'SELECT last_seq FROM trx_counters WHERE trx_date = ?',
      [trxDate],
    ),
    queryOne<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM transactions WHERE trx_date = ?',
      [trxDate],
    ),
  ]);
  const baseSeq = Math.max(counterRow?.last_seq ?? 0, existingCountRow?.cnt ?? 0);
  return formatTrxNumber(trxDate, baseSeq + 1);
}

export async function createTransactionAtomic(
  input: CreateTransactionInput,
): Promise<TransactionWithItems> {
  if (!input.customerName.trim()) {
    throw new Error('Nama pelanggan wajib diisi.');
  }
  if (!input.barberId) {
    throw new Error('Barber wajib dipilih.');
  }
  if (!input.items.length) {
    throw new Error('Minimal pilih satu layanan.');
  }

  const nowIso = new Date().toISOString();
  const trxDate = input.trxDate || getLocalDateString();

  const trxId = await withTransaction(async (tx) => {
    const barber = await tx.queryOne<Barber>(
      'SELECT * FROM barbers WHERE id = ? AND is_deleted = 0 AND is_active = 1',
      [input.barberId],
    );
    if (!barber) {
      throw new Error('Barber tidak ditemukan atau nonaktif.');
    }

    const resolvedItems: Array<{
      serviceId: string;
      serviceName: string;
      unitPrice: number;
      qty: number;
      lineTotal: number;
    }> = [];

    let subtotal = 0;
    for (const item of input.items) {
      const qty = Math.max(1, Math.round(item.qty));
      const service = await tx.queryOne<Service>(
        'SELECT * FROM services WHERE id = ? AND is_deleted = 0 AND is_active = 1',
        [item.serviceId],
      );
      if (!service) {
        throw new Error('Salah satu layanan yang dipilih tidak aktif atau tidak ditemukan.');
      }
      const lineTotal = service.price * qty;
      subtotal += lineTotal;
      resolvedItems.push({
        serviceId: service.id,
        serviceName: service.name,
        unitPrice: service.price,
        qty,
        lineTotal,
      });
    }

    const discountType = input.discountValue && input.discountValue > 0 ? input.discountType ?? 'amount' : null;
    const rawDiscountValue = discountType ? Math.max(0, Math.round(input.discountValue ?? 0)) : 0;
    if (discountType === 'percent' && rawDiscountValue > 100) {
      throw new Error('Diskon persen tidak boleh lebih dari 100%.');
    }
    if (discountType === 'amount' && rawDiscountValue > subtotal) {
      throw new Error('Diskon tidak boleh melebihi subtotal.');
    }

    const discountAmount = calculateDiscountAmount(subtotal, discountType, rawDiscountValue);
    const total = Math.max(0, subtotal - discountAmount);

    // Atomic daily sequence number inside the transaction
    await tx.execute('INSERT OR IGNORE INTO trx_counters (trx_date, last_seq) VALUES (?, 0)', [
      trxDate,
    ]);
    const existingCountRow = await tx.queryOne<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM transactions WHERE trx_date = ?',
      [trxDate],
    );
    const counterBefore = await tx.queryOne<{ last_seq: number }>(
      'SELECT last_seq FROM trx_counters WHERE trx_date = ?',
      [trxDate],
    );
    let seq = Math.max(counterBefore?.last_seq ?? 0, existingCountRow?.cnt ?? 0) + 1;
    let trxNumber = formatTrxNumber(trxDate, seq);
    while (
      await tx.queryOne<{ id: string }>('SELECT id FROM transactions WHERE trx_number = ?', [
        trxNumber,
      ])
    ) {
      seq += 1;
      trxNumber = formatTrxNumber(trxDate, seq);
    }
    await tx.execute('UPDATE trx_counters SET last_seq = ? WHERE trx_date = ?', [seq, trxDate]);

    const customer = await upsertCustomerInTx(tx, {
      customerId: input.customerId,
      name: input.customerName,
      phone: input.customerPhone,
    });

    const newTrxId = generateId();
    await tx.execute(
      `INSERT INTO transactions (
        id, trx_number, trx_date, created_at,
        customer_id, customer_name, customer_phone,
        barber_id, barber_name,
        subtotal, discount_type, discount_value, discount_amount, total,
        payment_method, notes, status, void_reason, voided_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', NULL, NULL)`,
      [
        newTrxId,
        trxNumber,
        trxDate,
        nowIso,
        customer.id,
        customer.name,
        customer.phone,
        barber.id,
        barber.name,
        subtotal,
        discountType,
        rawDiscountValue,
        discountAmount,
        total,
        input.paymentMethod,
        input.notes?.trim() || null,
      ],
    );

    for (const item of resolvedItems) {
      await tx.execute(
        `INSERT INTO transaction_items (
          id, transaction_id, service_id, service_name, unit_price, qty, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          newTrxId,
          item.serviceId,
          item.serviceName,
          item.unitPrice,
          item.qty,
          item.lineTotal,
        ],
      );
    }

    return newTrxId;
  });

  const created = await getTransactionById(trxId);
  if (!created) throw new Error('Transaksi gagal dimuat setelah disimpan.');
  return created;
}

export async function getTransactionById(id: string): Promise<TransactionWithItems | null> {
  const trx = await queryOne<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!trx) return null;

  const items = await query<TransactionItem>(
    'SELECT * FROM transaction_items WHERE transaction_id = ? ORDER BY rowid ASC',
    [id],
  );
  return { ...trx, items };
}

export async function listTransactions(options?: {
  from?: string;
  to?: string;
  search?: string;
  status?: 'all' | 'completed' | 'void';
  barberId?: string;
  customerId?: string;
  limit?: number;
  offset?: number;
}): Promise<TransactionWithItems[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (options?.from && options?.to) {
    where.push('trx_date BETWEEN ? AND ?');
    params.push(options.from, options.to);
  }
  if (options?.status && options.status !== 'all') {
    where.push('status = ?');
    params.push(options.status);
  }
  if (options?.barberId) {
    where.push('barber_id = ?');
    params.push(options.barberId);
  }
  if (options?.customerId) {
    where.push('customer_id = ?');
    params.push(options.customerId);
  }
  if (options?.search?.trim()) {
    const q = `%${options.search.trim()}%`;
    where.push('(trx_number LIKE ? OR customer_name LIKE ? OR barber_name LIKE ?)');
    params.push(q, q, q);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const rows = await query<Transaction>(
    `SELECT * FROM transactions ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  if (rows.length === 0) return [];

  const placeholders = rows.map(() => '?').join(',');
  const items = await query<TransactionItem>(
    `SELECT * FROM transaction_items WHERE transaction_id IN (${placeholders}) ORDER BY rowid ASC`,
    rows.map((r) => r.id),
  );

  const itemsByTrx = new Map<string, TransactionItem[]>();
  for (const item of items) {
    const list = itemsByTrx.get(item.transaction_id) ?? [];
    list.push(item);
    itemsByTrx.set(item.transaction_id, list);
  }

  return rows.map((row) => ({
    ...row,
    items: itemsByTrx.get(row.id) ?? [],
  }));
}

export async function voidTransaction(id: string, reason: string): Promise<void> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error('Alasan pembatalan wajib diisi.');
  }

  const existing = await queryOne<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!existing) {
    throw new Error('Transaksi tidak ditemukan.');
  }
  if (existing.status === 'void') {
    throw new Error('Transaksi sudah dibatalkan sebelumnya.');
  }

  await execute(
    `UPDATE transactions
     SET status = 'void', void_reason = ?, voided_at = ?
     WHERE id = ?`,
    [trimmedReason, new Date().toISOString(), id],
  );
}

export async function updateTransactionCustomerPhone(
  id: string,
  rawPhone: string,
): Promise<TransactionWithItems> {
  const normalized = normalizePhone(rawPhone);
  if (!normalized) {
    throw new Error('Nomor WhatsApp pelanggan tidak valid.');
  }

  const existing = await queryOne<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!existing) {
    throw new Error('Transaksi tidak ditemukan.');
  }

  const nowIso = new Date().toISOString();
  await withTransaction(async (tx) => {
    await tx.execute('UPDATE transactions SET customer_phone = ? WHERE id = ?', [normalized, id]);
    if (existing.customer_id) {
      const collision = await tx.queryOne<{ id: string }>(
        'SELECT id FROM customers WHERE phone = ? AND is_deleted = 0 AND id != ?',
        [normalized, existing.customer_id],
      );
      if (!collision) {
        await tx.execute('UPDATE customers SET phone = ?, updated_at = ? WHERE id = ?', [
          normalized,
          nowIso,
          existing.customer_id,
        ]);
      }
    }
  });

  const updated = await getTransactionById(id);
  if (!updated) {
    throw new Error('Gagal memperbarui nomor WhatsApp transaksi.');
  }
  return updated;
}


