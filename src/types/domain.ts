export type PaymentMethod = 'cash' | 'transfer' | 'qris';
export type DiscountType = 'amount' | 'percent';
export type TransactionStatus = 'completed' | 'void';

export interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number | null;
  is_active: number;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface Barber {
  id: string;
  name: string;
  phone: string | null;
  is_active: number;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface BarberWithStats extends Barber {
  trx_count: number;
  unique_customers: number;
  total_revenue: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithStats extends Customer {
  visit_count: number;
  total_spent: number;
  last_visit: string | null;
}

export interface Transaction {
  id: string;
  trx_number: string;
  trx_date: string;
  created_at: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  barber_id: string;
  barber_name: string;
  subtotal: number;
  discount_type: DiscountType | null;
  discount_value: number;
  discount_amount: number;
  total: number;
  payment_method: PaymentMethod;
  notes: string | null;
  status: TransactionStatus;
  void_reason: string | null;
  voided_at: string | null;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  service_id: string | null;
  service_name: string;
  unit_price: number;
  qty: number;
  line_total: number;
}

export interface TransactionWithItems extends Transaction {
  items: TransactionItem[];
}

export interface AppSettings {
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  shop_logo: string;
  receipt_footer: string;
  followup_template: string;
  backup_interval_days: number;
  last_backup_at: string | null;
  week_start: 0 | 1;
  pin_hash: string;
  pin_salt: string;
  currency: string;
  onboarding_completed: boolean;
  auto_backup_last_at: string | null;
}

export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export interface TrxCounterRow {
  trx_date: string;
  last_seq: number;
}

export interface SchemaVersionRow {
  version: number;
  applied_at: string;
}

export interface DashboardStats {
  todayRevenue: number;
  todayTrxCount: number;
  yesterdayRevenue: number;
  totalCustomers: number;
  newCustomersToday: number;
  averageTransaction: number;
  topServiceName: string | null;
  topServiceCount: number;
}

export interface RevenueChartPoint {
  label: string;
  key: string;
  revenue: number;
  trxCount: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalSubtotal: number;
  totalDiscount: number;
  trxCount: number;
  voidCount: number;
  averageTransaction: number;
}

export interface ServiceReportRow {
  service_name: string;
  qty: number;
  revenue: number;
}

export interface BarberReportRow {
  barber_id: string;
  barber_name: string;
  trx_count: number;
  revenue: number;
}

export interface PaymentMethodReportRow {
  payment_method: PaymentMethod;
  trx_count: number;
  revenue: number;
}

export interface BackupTableData {
  settings: SettingRow[];
  services: Service[];
  barbers: Barber[];
  customers: Customer[];
  transactions: Transaction[];
  transaction_items: TransactionItem[];
  trx_counters: TrxCounterRow[];
}

export interface BackupMeta {
  app: string;
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  counts: {
    settings: number;
    services: number;
    barbers: number;
    customers: number;
    transactions: number;
    transaction_items: number;
    trx_counters: number;
  };
  checksum: string;
}

export interface BackupFile {
  meta: BackupMeta;
  data: BackupTableData;
}

export interface AutoSnapshotEntry {
  id: string;
  reason: 'auto' | 'pre-restore';
  createdAt: string;
  trxCount: number;
  customerCount: number;
  payload: string;
}

