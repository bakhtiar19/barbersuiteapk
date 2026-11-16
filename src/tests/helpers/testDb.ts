import path from 'node:path';
import initSqlJs from 'sql.js';
import { setTestDatabase, type SqlJsDatabaseLike } from '@/db/client';

let sqlPromise: Promise<initSqlJs.SqlJsStatic> | null = null;

function getSqlStatic() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
    });
  }
  return sqlPromise;
}

export async function setupFreshTestDb(): Promise<initSqlJs.Database> {
  const SQL = await getSqlStatic();
  const db = new SQL.Database();
  await setTestDatabase(db as unknown as SqlJsDatabaseLike);
  return db;
}

