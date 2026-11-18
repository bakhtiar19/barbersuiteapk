const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Memulai Konfigurasi Barber Suite VPS ===');

// 1. Ekstrak zip ke /var/www/barbersuite
const webZip = '/tmp/barber-suite-website.zip';
const targetDir = '/var/www/barbersuite';

if (fs.existsSync(webZip)) {
  console.log(`[1] Mengekstrak ${webZip} ke ${targetDir}...`);
  fs.mkdirSync(targetDir, { recursive: true });
  execSync(`unzip -o "${webZip}" -d "${targetDir}"`, { stdio: 'inherit' });
  execSync(`chown -R www-data:www-data "${targetDir}" || true`, { stdio: 'inherit' });
  execSync(`chmod -R 755 "${targetDir}"`, { stdio: 'inherit' });
  fs.unlinkSync(webZip);
  console.log('[OK] File web kasir berhasil diekstrak.');
} else {
  console.log('[WARN] File zip tidak ditemukan di /tmp, memastikan folder /var/www/barbersuite siap.');
  fs.mkdirSync(targetDir, { recursive: true });
}

// 2. Patch Nginx
console.log('[2] Memeriksa konfigurasi Nginx...');
const barberNginxBlock = `
    # BARBERSUITE_START
    location ^~ /barbersuite {
        root /var/www;
        index index.html;
        try_files $uri $uri/ /barbersuite/index.html;
    }

    location ~* /barbersuite/.*\\.wasm$ {
        root /var/www;
        types { application/wasm wasm; }
        default_type application/wasm;
    }
    # BARBERSUITE_END
`;

const nginxDirs = ['/etc/nginx/sites-enabled', '/etc/nginx/conf.d'];
let nginxModified = 0;

nginxDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    try {
      if (!fs.statSync(fullPath).isFile()) return;
      let conf = fs.readFileSync(fullPath, 'utf8');

      // Hapus blok lama
      conf = conf.replace(/# BARBERSUITE_START[\s\S]*?# BARBERSUITE_END\n?/g, '');

      // Sisipkan jika ada location /
      if (/location\s+\/\s*\{/.test(conf)) {
        conf = conf.replace(/location\s+\/\s*\{/g, barberNginxBlock + '\n    location / {');
        fs.writeFileSync(fullPath, conf, 'utf8');
        console.log(`[OK] Menambahkan rute /barbersuite ke ${fullPath}`);
        nginxModified++;
      }
    } catch (e) {
      console.log(`[SKIP] ${fullPath}: ${e.message}`);
    }
  });
});

try {
  execSync('nginx -t', { stdio: 'inherit' });
  execSync('systemctl reload nginx || systemctl restart nginx', { stdio: 'inherit' });
  console.log('[OK] Nginx berhasil direload.');
} catch (e) {
  console.error('[WARN] Gagal reload Nginx:', e.message);
}

// 3. Patch Express License Server sebagai perlindungan ganda
console.log('[3] Memeriksa Express License Server (/home/antigravity/barber-license-server)...');
const licenseDirs = [
  '/home/antigravity/barber-license-server',
  '/home/antigravity/license-server',
  '/root/barber-license-server',
  '/var/www/barber-license-server',
];

let expressPatched = false;

licenseDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) return;
  console.log(`Ditemukan folder backend: ${dir}`);

  const jsFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  jsFiles.forEach((file) => {
    const jsPath = path.join(dir, file);
    try {
      let code = fs.readFileSync(jsPath, 'utf8');
      if (code.includes('express') && (code.includes('app.listen') || code.includes('server.listen'))) {
        // Hapus patch lama
        code = code.replace(/\/\/ BARBERSUITE_FALLBACK[\s\S]*?\/\/ BARBERSUITE_FALLBACK_END\n?/g, '');

        const fallback = `
// BARBERSUITE_FALLBACK
try {
  const path = require('path');
  const express = require('express');
  app.use('/barbersuite', express.static('/var/www/barbersuite'));
  app.get('/barbersuite*', (req, res) => {
    res.sendFile(path.join('/var/www/barbersuite', 'index.html'));
  });
} catch (err) {
  console.error('Barbersuite fallback error:', err);
}
// BARBERSUITE_FALLBACK_END
`;
        const listenTarget = code.includes('app.listen') ? 'app.listen' : 'server.listen';
        code = code.replace(listenTarget, fallback + '\n' + listenTarget);
        fs.writeFileSync(jsPath, code, 'utf8');
        console.log(`[OK] Express fallback berhasil dipasang di ${jsPath}`);
        expressPatched = true;
      }
    } catch (e) {
      console.log(`[SKIP] ${jsPath}: ${e.message}`);
    }
  });
});

// Restart PM2 jika ada
try {
  console.log('[4] Merestart service Node/Express...');
  execSync('pm2 restart all || true', { stdio: 'inherit' });
} catch (e) {
  // Abaikan jika pm2 tidak ada
}

console.log('=== SEMUA PROSES SELESAI ===');
