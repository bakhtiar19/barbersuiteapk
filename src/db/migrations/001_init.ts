export const MIGRATION_001_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_services_name ON services (LOWER(name)) WHERE is_deleted = 0`,
  `CREATE TABLE IF NOT EXISTS barbers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_customers_phone ON customers (phone) WHERE phone IS NOT NULL AND is_deleted = 0`,
  `CREATE INDEX IF NOT EXISTS ix_customers_name ON customers (name COLLATE NOCASE)`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    trx_number TEXT NOT NULL UNIQUE,
    trx_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    customer_id TEXT REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    barber_id TEXT NOT NULL REFERENCES barbers(id),
    barber_name TEXT NOT NULL,
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
    discount_type TEXT CHECK (discount_type IN ('amount', 'percent')),
    discount_value INTEGER NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
    discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total INTEGER NOT NULL CHECK (total >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'qris')),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'void')),
    void_reason TEXT,
    voided_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS ix_trx_date ON transactions (trx_date, status)`,
  `CREATE INDEX IF NOT EXISTS ix_trx_customer ON transactions (customer_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS ix_trx_barber ON transactions (barber_id, trx_date)`,
  `CREATE TABLE IF NOT EXISTS transaction_items (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    service_id TEXT REFERENCES services(id),
    service_name TEXT NOT NULL,
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
    qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
    line_total INTEGER NOT NULL CHECK (line_total >= 0)
  )`,
  `CREATE INDEX IF NOT EXISTS ix_items_trx ON transaction_items (transaction_id)`,
  `CREATE INDEX IF NOT EXISTS ix_items_service ON transaction_items (service_id)`,
  `CREATE TABLE IF NOT EXISTS trx_counters (
    trx_date TEXT PRIMARY KEY,
    last_seq INTEGER NOT NULL
  )`,
];

