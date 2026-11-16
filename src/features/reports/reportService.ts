import {
  getDailyRevenueRangeSeries,
  getReportSummary,
  getRevenueByBarber,
  getRevenueByPaymentMethod,
  getRevenueByService,
} from '@/db/repositories/reportQueries';
import { listTransactions } from '@/db/repositories/transactionRepo';
import { PAYMENT_METHOD_LABELS } from '@/features/receipt/receiptService';
import { buildCsvWithBom } from '@/lib/csv';
import { formatDateTimeId } from '@/lib/date';
import { generateReportPdfBlob } from '@/lib/pdf';
import { saveFile } from '@/platform/files';
import type {
  AppSettings,
  BarberReportRow,
  PaymentMethodReportRow,
  ReportSummary,
  RevenueChartPoint,
  ServiceReportRow,
  TransactionWithItems,
} from '@/types/domain';

export interface FullReportData {
  summary: ReportSummary;
  byService: ServiceReportRow[];
  byBarber: BarberReportRow[];
  byPaymentMethod: PaymentMethodReportRow[];
  series: RevenueChartPoint[];
  transactions: TransactionWithItems[];
}

export async function loadReportData(
  from: string,
  to: string,
  statusFilter: 'all' | 'completed' | 'void' = 'all',
): Promise<FullReportData> {
  const [summary, byService, byBarber, byPaymentMethod, series, transactions] = await Promise.all([
    getReportSummary(from, to),
    getRevenueByService(from, to),
    getRevenueByBarber(from, to),
    getRevenueByPaymentMethod(from, to),
    getDailyRevenueRangeSeries(from, to),
    listTransactions({ from, to, status: statusFilter, limit: 200, offset: 0 }),
  ]);

  return {
    summary,
    byService,
    byBarber,
    byPaymentMethod,
    series,
    transactions,
  };
}

export async function exportReportCsv(
  from: string,
  to: string,
  data: FullReportData,
): Promise<string> {
  const headers = [
    'No Transaksi',
    'Tanggal',
    'Waktu',
    'Pelanggan',
    'Barber',
    'Layanan',
    'Subtotal',
    'Diskon',
    'Total',
    'Metode Bayar',
    'Status',
    'Alasan Void',
  ];

  const rows = data.transactions.map((trx) => [
    trx.trx_number,
    trx.trx_date,
    formatDateTimeId(trx.created_at),
    trx.customer_name,
    trx.barber_name,
    trx.items.map((i) => `${i.service_name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join('; '),
    trx.subtotal,
    trx.discount_amount,
    trx.total,
    PAYMENT_METHOD_LABELS[trx.payment_method] ?? trx.payment_method,
    trx.status,
    trx.void_reason ?? '',
  ]);

  const csv = buildCsvWithBom(headers, rows);
  const filename = `laporan-bms-${from}_sd_${to}.csv`;
  await saveFile({
    filename,
    content: csv,
    mimeType: 'text/csv;charset=utf-8',
  });
  return filename;
}

export async function exportReportPdf(
  from: string,
  to: string,
  settings: AppSettings,
  data: FullReportData,
  shareAfterSave = false,
): Promise<string> {
  const blob = generateReportPdfBlob({
    shopName: settings.shop_name,
    shopAddress: settings.shop_address,
    shopPhone: settings.shop_phone,
    from,
    to,
    summary: data.summary,
    byService: data.byService,
    byBarber: data.byBarber,
    byPaymentMethod: data.byPaymentMethod,
    transactions: data.transactions,
  });

  const filename = `laporan-bms-${from}_sd_${to}.pdf`;
  await saveFile({
    filename,
    content: blob,
    mimeType: 'application/pdf',
    shareAfterSave,
    shareTitle: `Laporan ${settings.shop_name}`,
  });
  return filename;
}

