import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader';
import { MIGRATIONS } from '@/db/migrations';
import { seedInitialData } from '@/db/seed';

export const DB_NAME = 'barbershop_bms';

export interface DbRunResult {
  changes: number;
  lastId?: number;
}

export interface DbExecutor {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<DbRunResult>;
}

export interface SqlJsDatabaseLike {
  run(sql: string, params?: unknown[]): unknown;
  exec(sql: string, params?: unknown[]): Array<{ columns: string[]; values: unknown[][] }>;
  prepare(sql: string): {
    bind(params?: unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
  };
  getRowsModified(): number;
}

let initialized = false;
let initPromise: Promise<void> | null = null;
let testSqlJsDb: SqlJsDatabaseLike | null = null;
let operationQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = operationQueue.then(task, task);
  operationQueue = next.catch(() => undefined);
  return next;
}

async function persistWebStore(): Promise<void> {
  if (!testSqlJsDb && !Capacitor.isNativePlatform()) {
    await CapacitorSQLite.saveToStore({ database: DB_NAME });
  }
}

function sqlJsQuery<T>(db: SqlJsDatabaseLike, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    if (params.length > 0) {
      stmt.bind(params);
    }
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

function sqlJsExecute(db: SqlJsDatabaseLike, sql: string, params: unknown[] = []): DbRunResult {
  db.run(sql, params);
  return { changes: db.getRowsModified() };
}

function createExecutor(inTransaction: boolean): DbExecutor {
  if (testSqlJsDb) {
    const db = testSqlJsDb;
    return {
      query: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
        sqlJsQuery<T>(db, sql, params),
      queryOne: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        const rows = sqlJsQuery<T>(db, sql, params);
        return rows[0] ?? null;
      },
      execute: async (sql: string, params: unknown[] = []) => sqlJsExecute(db, sql, params),
    };
  }

  return {
    query: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
      const normalizedParams = params.map((v) => (v === undefined ? null : v));
      const res = await CapacitorSQLite.query({
        database: DB_NAME,
        statement: sql,
        values: normalizedParams,
      });
      return (res.values ?? []) as T[];
    },
    queryOne: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
      const normalizedParams = params.map((v) => (v === undefined ? null : v));
      const res = await CapacitorSQLite.query({
        database: DB_NAME,
        statement: sql,
        values: normalizedParams,
      });
      const rows = (res.values ?? []) as T[];
      return rows[0] ?? null;
    },
    execute: async (sql: string, params: unknown[] = []) => {
      const normalizedParams = params.map((v) => (v === undefined ? null : v));
      const isDdlOrPragma =
        normalizedParams.length === 0 && /^\s*(CREATE|DROP|ALTER|PRAGMA)\b/i.test(sql);

      if (isDdlOrPragma) {
        const res = await CapacitorSQLite.execute({
          database: DB_NAME,
          statements: sql,
          transaction: !inTransaction,
        });
        if (!inTransaction) {
          await persistWebStore();
        }
        return {
          changes: Math.max(0, res.changes?.changes ?? 0),
        };
      }

      const res = await CapacitorSQLite.run({
        database: DB_NAME,
        statement: sql,
        values: normalizedParams,
        transaction: !inTransaction,
      });
      if (!inTransaction) {
        await persistWebStore();
      }
      return {
        changes: res.changes?.changes ?? 0,
        lastId: res.changes?.lastId,
      };
    },
  };
}

async function ensureJeepElement(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  defineJeepSqlite(window);
  const wasmPath =
    window.location.pathname.startsWith('/barbersuite') ? '/barbersuite/assets' : '/assets';
  let el = document.querySelector('jeep-sqlite');
  if (!el) {
    el = document.createElement('jeep-sqlite');
    el.setAttribute('autoSave', 'true');
    el.setAttribute('wasmPath', wasmPath);
    document.body.appendChild(el);
  } else {
    el.setAttribute('wasmPath', wasmPath);
    if (!el.hasAttribute('autoSave')) {
      el.setAttribute('autoSave', 'true');
    }
  }
  await customElements.whenDefined('jeep-sqlite');
}

async function runMigrations(): Promise<void> {
  const exec = createExecutor(false);

  // Ensure schema_version exists before querying version
  await exec.execute(
    `CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`,
  );

  const row = await exec.queryOne<{ max_version: number | null }>(
    'SELECT MAX(version) AS max_version FROM schema_version',
  );
  const currentVersion = Number(row?.max_version) || 0;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    await runInTransactionInternal(async (tx) => {
      for (const stmt of migration.statements) {
        await tx.execute(stmt);
      }
      await tx.execute('INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, ?)', [
        migration.version,
        new Date().toISOString(),
      ]);
    });
  }
}

async function runInTransactionInternal<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  if (testSqlJsDb) {
    const db = testSqlJsDb;
    const tx = createExecutor(true);
    db.run('BEGIN TRANSACTION');
    try {
      const result = await fn(tx);
      db.run('COMMIT');
      return result;
    } catch (err) {
      try {
        db.run('ROLLBACK');
      } catch {
        // ignore rollback error
      }
      throw err;
    }
  }

  const tx = createExecutor(true);
  await CapacitorSQLite.beginTransaction({ database: DB_NAME });
  try {
    const result = await fn(tx);
    await CapacitorSQLite.commitTransaction({ database: DB_NAME });
    await persistWebStore();
    return result;
  } catch (err) {
    try {
      await CapacitorSQLite.rollbackTransaction({ database: DB_NAME });
    } catch {
      // ignore rollback error
    }
    throw err;
  }
}

export async function initDatabase(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!testSqlJsDb) {
      if (!Capacitor.isNativePlatform()) {
        await ensureJeepElement();
        await CapacitorSQLite.initWebStore();
      }

      const consistency = await CapacitorSQLite.checkConnectionsConsistency({
        dbNames: [DB_NAME],
        openModes: ['RW'],
      }).catch(() => ({ result: false }));

      if (!consistency.result) {
        await CapacitorSQLite.createConnection({
          database: DB_NAME,
          version: 1,
          encrypted: false,
          mode: 'no-encryption',
          readonly: false,
        });
      }

      const openCheck = await CapacitorSQLite.isDBOpen({ database: DB_NAME }).catch(() => ({
        result: false,
      }));
      if (!openCheck.result) {
        await CapacitorSQLite.open({ database: DB_NAME });
      }

      // Clean up any stale transaction before running PRAGMAs or migrations
      await CapacitorSQLite.rollbackTransaction({ database: DB_NAME }).catch(() => undefined);
    }

    if (testSqlJsDb) {
      const exec = createExecutor(false);
      await exec.execute('PRAGMA foreign_keys = ON');
    } else {
      // PRAGMA foreign_keys and PRAGMA journal_mode=WAL must execute outside any transaction
      await CapacitorSQLite.execute({
        database: DB_NAME,
        statements: 'PRAGMA foreign_keys = ON;',
        transaction: false,
      }).catch(() => undefined);

      if (Capacitor.isNativePlatform()) {
        await CapacitorSQLite.query({
          database: DB_NAME,
          statement: 'PRAGMA journal_mode = WAL;',
          values: [],
        }).catch(() => undefined);
      }
    }

    await runMigrations();
    await seedInitialData();
    await persistWebStore();
    initialized = true;
  })().catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}

export async function setTestDatabase(db: SqlJsDatabaseLike | null): Promise<void> {
  testSqlJsDb = db;
  initialized = false;
  initPromise = null;
  operationQueue = Promise.resolve();
  if (db) {
    await initDatabase();
  }
}

export function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return enqueue(() => createExecutor(false).query<T>(sql, params));
}

export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  return enqueue(() => createExecutor(false).queryOne<T>(sql, params));
}

export function execute(sql: string, params: unknown[] = []): Promise<DbRunResult> {
  return enqueue(() => createExecutor(false).execute(sql, params));
}

export function withTransaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  return enqueue(() => runInTransactionInternal(fn));
}

