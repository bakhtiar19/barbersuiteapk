import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateId, formatDateTimeId } from '@/lib/date';
import { formatRupiah } from '@/lib/money';
import type {
  BarberReportRow,
  PaymentMethod,
  PaymentMethodReportRow,
  ReportSummary,
  ServiceReportRow,
  TransactionWithItems,
} from '@/types/domain';

export interface PdfReportInput {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  from: string;
  to: string;
  summary: ReportSummary;
  byService: ServiceReportRow[];
  byBarber: BarberReportRow[];
  byPaymentMethod: PaymentMethodReportRow[];
  transactions: TransactionWithItems[];
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
};

export function generateReportPdfBlob(input: PdfReportInput): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(input.shopName || 'Barber Suite v4.2.0 by Kriakarya', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const subParts = [input.shopAddress, input.shopPhone].filter(Boolean);
  if (subParts.length > 0) {
    doc.text(subParts.join(' · '), 14, 18);
  }
  doc.text(
    `Laporan Keuangan: ${formatDateId(input.from)} - ${formatDateId(input.to)}`,
    14,
    24,
  );

  doc.setTextColor(31, 41, 55);
  let y = 36;

  // Ringkasan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Ringkasan Periode', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Total Omzet', 'Transaksi Selesai', 'Rata-rata', 'Total Diskon', 'Transaksi Void']],
    body: [
      [
        formatRupiah(input.summary.totalRevenue),
        String(input.summary.trxCount),
        formatRupiah(input.summary.averageTransaction),
        formatRupiah(input.summary.totalDiscount),
        String(input.summary.voidCount),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [180, 83, 9], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 9, fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Pendapatan per Layanan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Pendapatan per Layanan (Sebelum Diskon)', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Layanan', 'Jumlah Item', 'Pendapatan']],
    body:
      input.byService.length > 0
        ? input.byService.map((row) => [row.service_name, String(row.qty), formatRupiah(row.revenue)])
        : [['Belum ada data layanan', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [17, 24, 39], fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Pendapatan per Barber
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Pendapatan per Barber', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Barber', 'Transaksi', 'Omzet']],
    body:
      input.byBarber.length > 0
        ? input.byBarber.map((row) => [row.barber_name, String(row.trx_count), formatRupiah(row.revenue)])
        : [['Belum ada data barber', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [17, 24, 39], fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Metode Pembayaran
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Per Metode Pembayaran', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Metode', 'Transaksi', 'Nominal']],
    body:
      input.byPaymentMethod.length > 0
        ? input.byPaymentMethod.map((row) => [
            PAYMENT_LABEL[row.payment_method] ?? row.payment_method,
            String(row.trx_count),
            formatRupiah(row.revenue),
          ])
        : [['Belum ada data', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [17, 24, 39], fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Daftar Transaksi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Rincian Transaksi', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['No. Transaksi', 'Waktu', 'Pelanggan', 'Barber', 'Layanan', 'Metode', 'Total']],
    body:
      input.transactions.length > 0
        ? input.transactions.map((trx) => [
            trx.status === 'void' ? `${trx.trx_number} (VOID)` : trx.trx_number,
            formatDateTimeId(trx.created_at),
            trx.customer_name,
            trx.barber_name,
            trx.items.map((it) => `${it.service_name}${it.qty > 1 ? ` x${it.qty}` : ''}`).join(', '),
            PAYMENT_LABEL[trx.payment_method] ?? trx.payment_method,
            formatRupiah(trx.total),
          ])
        : [['Tidak ada transaksi pada periode ini', '', '', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [17, 24, 39], fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5 },
    margin: { left: 14, right: 14 },
  });

  return doc.output('blob');
}

