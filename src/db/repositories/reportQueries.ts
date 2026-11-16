import { query, queryOne } from '@/db/client';
import {
  formatMonthShortId,
  formatShortDateId,
  getLastNDaysKeys,
  getLastNMonthsKeys,
  getLocalDateString,
  parseFlexibleDate,
} from '@/lib/date';
import { eachDayOfInterval, endOfDay, format, startOfDay } from 'date-fns';
import type {
  BarberReportRow,
  DashboardStats,
  PaymentMethodReportRow,
  ReportSummary,
  RevenueChartPoint,
  ServiceReportRow,
} from '@/types/domain';

export async function getDashboardStats(
  todayDate: string = getLocalDateString(),
  yesterdayDate?: string,
): Promise<DashboardStats> {
  const yDate =
    yesterdayDate ||
    (() => {
      const d = parseFlexibleDate(todayDate);
      d.setDate(d.getDate() - 1);
      return getLocalDateString(d);
    })();

  const monthPrefix = todayDate.slice(0, 7);

  const todayRow = await queryOne<{ revenue: number; trx_count: number }>(
    `SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS trx_count
     FROM transactions
     WHERE trx_date = ? AND status = 'completed'`,
    [todayDate],
  );

  const yesterdayRow = await queryOne<{ revenue: number }>(
    `SELECT COALESCE(SUM(total), 0) AS revenue
     FROM transactions
     WHERE trx_date = ? AND status = 'completed'`,
    [yDate],
  );

  const customersRow = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM customers WHERE is_deleted = 0',
  );

  const parsedToday = parseFlexibleDate(todayDate);
  const dayStartIso = startOfDay(parsedToday).toISOString();
  const dayEndIso = endOfDay(parsedToday).toISOString();

  const newCustomersRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM customers
     WHERE is_deleted = 0 AND created_at BETWEEN ? AND ?`,
    [dayStartIso, dayEndIso],
  );

  // Top service this month; fallback all time
  let topService = await queryOne<{ service_name: string; cnt: number }>(
    `SELECT i.service_name, SUM(i.qty) AS cnt
     FROM transaction_items i
     JOIN transactions t ON t.id = i.transaction_id
     WHERE substr(t.trx_date, 1, 7) = ? AND t.status = 'completed'
     GROUP BY i.service_name
     ORDER BY cnt DESC
     LIMIT 1`,
    [monthPrefix],
  );

  if (!topService) {
    topService = await queryOne<{ service_name: string; cnt: number }>(
      `SELECT i.service_name, SUM(i.qty) AS cnt
       FROM transaction_items i
       JOIN transactions t ON t.id = i.transaction_id
       WHERE t.status = 'completed'
       GROUP BY i.service_name
       ORDER BY cnt DESC
       LIMIT 1`,
    );
  }

  const todayRevenue = todayRow?.revenue ?? 0;
  const todayTrxCount = todayRow?.trx_count ?? 0;

  return {
    todayRevenue,
    todayTrxCount,
    yesterdayRevenue: yesterdayRow?.revenue ?? 0,
    totalCustomers: customersRow?.total ?? 0,
    newCustomersToday: newCustomersRow?.cnt ?? 0,
    averageTransaction: todayTrxCount > 0 ? Math.round(todayRevenue / todayTrxCount) : 0,
    topServiceName: topService?.service_name ?? null,
    topServiceCount: topService?.cnt ?? 0,
  };
}

export async function getDailyRevenueSeries(days = 30): Promise<RevenueChartPoint[]> {
  const keys = getLastNDaysKeys(days);
  const from = keys[0];
  const to = keys[keys.length - 1];

  const rows = await query<{ day: string; revenue: number; trx_count: number }>(
    `SELECT trx_date AS day, COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS trx_count
     FROM transactions
     WHERE trx_date BETWEEN ? AND ? AND status = 'completed'
     GROUP BY trx_date`,
    [from, to],
  );

  const byDay = new Map(rows.map((r) => [r.day, r]));
  return keys.map((key) => {
    const found = byDay.get(key);
    return {
      key,
      label: formatShortDateId(key),
      revenue: found?.revenue ?? 0,
      trxCount: found?.trx_count ?? 0,
    };
  });
}

export async function getMonthlyRevenueSeries(months = 12): Promise<RevenueChartPoint[]> {
  const keys = getLastNMonthsKeys(months);
  const fromMonth = `${keys[0]}-01`;

  const rows = await query<{ ym: string; revenue: number; trx_count: number }>(
    `SELECT substr(trx_date, 1, 7) AS ym, COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS trx_count
     FROM transactions
     WHERE trx_date >= ? AND status = 'completed'
     GROUP BY substr(trx_date, 1, 7)`,
    [fromMonth],
  );

  const byMonth = new Map(rows.map((r) => [r.ym, r]));
  return keys.map((key) => {
    const found = byMonth.get(key);
    return {
      key,
      label: formatMonthShortId(key),
      revenue: found?.revenue ?? 0,
      trxCount: found?.trx_count ?? 0,
    };
  });
}

export async function getDailyRevenueRangeSeries(
  from: string,
  to: string,
): Promise<RevenueChartPoint[]> {
  const start = parseFlexibleDate(from);
  const end = parseFlexibleDate(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const rows = await query<{ day: string; revenue: number; trx_count: number }>(
    `SELECT trx_date AS day, COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS trx_count
     FROM transactions
     WHERE trx_date BETWEEN ? AND ? AND status = 'completed'
     GROUP BY trx_date`,
    [from, to],
  );
  const byDay = new Map(rows.map((r) => [r.day, r]));

  const days = eachDayOfInterval({
    start,
    end,
  });

  return days.map((d) => {
    const key = format(d, 'yyyy-MM-dd');
    const found = byDay.get(key);
    return {
      key,
      label: formatShortDateId(key),
      revenue: found?.revenue ?? 0,
      trxCount: found?.trx_count ?? 0,
    };
  });
}

export async function getReportSummary(from: string, to: string): Promise<ReportSummary> {
  const completed = await queryOne<{
    total_revenue: number;
    total_subtotal: number;
    total_discount: number;
    trx_count: number;
  }>(
    `SELECT COALESCE(SUM(total), 0) AS total_revenue,
            COALESCE(SUM(subtotal), 0) AS total_subtotal,
            COALESCE(SUM(discount_amount), 0) AS total_discount,
            COUNT(*) AS trx_count
     FROM transactions
     WHERE trx_date BETWEEN ? AND ? AND status = 'completed'`,
    [from, to],
  );

  const voided = await queryOne<{ void_count: number }>(
    `SELECT COUNT(*) AS void_count
     FROM transactions
     WHERE trx_date BETWEEN ? AND ? AND status = 'void'`,
    [from, to],
  );

  const totalRevenue = completed?.total_revenue ?? 0;
  const trxCount = completed?.trx_count ?? 0;

  return {
    totalRevenue,
    totalSubtotal: completed?.total_subtotal ?? 0,
    totalDiscount: completed?.total_discount ?? 0,
    trxCount,
    voidCount: voided?.void_count ?? 0,
    averageTransaction: trxCount > 0 ? Math.round(totalRevenue / trxCount) : 0,
  };
}

export async function getRevenueByService(from: string, to: string): Promise<ServiceReportRow[]> {
  return query<ServiceReportRow>(
    `SELECT i.service_name,
            COALESCE(SUM(i.qty), 0) AS qty,
            COALESCE(SUM(i.line_total), 0) AS revenue
     FROM transaction_items i
     JOIN transactions t ON t.id = i.transaction_id
     WHERE t.trx_date BETWEEN ? AND ? AND t.status = 'completed'
     GROUP BY i.service_name
     ORDER BY revenue DESC, qty DESC`,
    [from, to],
  );
}

export async function getRevenueByBarber(from: string, to: string): Promise<BarberReportRow[]> {
  return query<BarberReportRow>(
    `SELECT barber_id,
            barber_name,
            COUNT(*) AS trx_count,
            COALESCE(SUM(total), 0) AS revenue
     FROM transactions
     WHERE trx_date BETWEEN ? AND ? AND status = 'completed'
     GROUP BY barber_id, barber_name
     ORDER BY revenue DESC, trx_count DESC`,
    [from, to],
  );
}

export async function getRevenueByPaymentMethod(
  from: string,
  to: string,
): Promise<PaymentMethodReportRow[]> {
  return query<PaymentMethodReportRow>(
    `SELECT payment_method,
            COUNT(*) AS trx_count,
            COALESCE(SUM(total), 0) AS revenue
     FROM transactions
     WHERE trx_date BETWEEN ? AND ? AND status = 'completed'
     GROUP BY payment_method
     ORDER BY revenue DESC`,
    [from, to],
  );
}
