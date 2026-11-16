import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const targetDir = path.join(rootDir, 'public', 'assets');
const targetFile = path.join(targetDir, 'sql-wasm.wasm');

const candidates = [
  path.join(rootDir, 'node_modules', 'jeep-sqlite', 'dist', 'assets', 'sql-wasm.wasm'),
  path.join(rootDir, 'node_modules', 'jeep-sqlite', 'dist', 'jeep-sqlite', 'assets', 'sql-wasm.wasm'),
  path.join(rootDir, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
];

const source = candidates.find((p) => fs.existsSync(p));
if (!source) {
  console.warn('[copy-wasm] sql-wasm.wasm not found yet, skipping.');
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, targetFile);
console.log(`[copy-wasm] Copied ${path.relative(rootDir, source)} -> public/assets/sql-wasm.wasm`);

