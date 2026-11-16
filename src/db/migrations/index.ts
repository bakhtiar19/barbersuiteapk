import { MIGRATION_001_STATEMENTS } from './001_init';

export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_init',
    statements: MIGRATION_001_STATEMENTS,
  },
];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

