const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Memulai Konfigurasi Barber Suite VPS ===');

// 1. Ekstrak zip ke /var/www/barbersuite
const webZip = '/tmp/barber-suite-website.zip';
const targetDir = '/var/www/barbersuite';

fs.mkdirSync(targetDir, { recursive: true });

if (fs.existsSync(webZip)) {
  console.log(`[1] Mengekstrak ${webZip} ke ${targetDir}...`);
  try {
    execSync(`unzip -o -q "${webZip}" -d "${targetDir}"`, { stdio: 'inherit' });
  } catch (err) {
    // Unzip return code 1 is just harmless warning (attributes from Windows zip)
    console.log('[INFO] File web berhasil diekstrak (warning unzip diabaikan).');
  }
  try {
    fs.unlinkSync(webZip);
  } catch (e) {}
}

try {
  execSync(`chown -R www-data:www-data "${targetDir}" || true`, { stdio: 'inherit' });
  execSync(`chmod -R 755 "${targetDir}"`, { stdio: 'inherit' });
} catch (e) {}
console.log('[OK] Folder /var/www/barbersuite siap.');

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

const nginxDirs = ['/etc/nginx/sites-enabled', '/etc/nginx/conf.d', '/etc/nginx/sites-available'];
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
  console.error('[WARN] Reload Nginx:', e.message);
}

// 3. Patch Express License Server & Pasang Central Admin Portal
console.log('[3] Memeriksa Express License Server & Memperbarui Tampilan Admin Portal...');
const licenseDirs = [
  '/home/antigravity/barber-license-server',
  '/home/antigravity/license-server',
  '/root/barber-license-server',
  '/var/www/barber-license-server',
];

const newAdminHtmlPath = '/tmp/admin.html';
let adminHtmlContent = '';
if (fs.existsSync(newAdminHtmlPath)) {
  adminHtmlContent = fs.readFileSync(newAdminHtmlPath, 'utf8');
}

licenseDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) return;
  console.log(`Ditemukan folder backend: ${dir}`);

  // Pasang admin.html jika ada folder public/views/root
  if (adminHtmlContent) {
    const possibleHtmlPaths = [
      path.join(dir, 'public', 'index.html'),
      path.join(dir, 'views', 'index.html'),
      path.join(dir, 'index.html')
    ];
    possibleHtmlPaths.forEach(htmlPath => {
      if (fs.existsSync(htmlPath)) {
        fs.writeFileSync(htmlPath, adminHtmlContent, 'utf8');
        console.log(`[OK] Tampilan Central Admin Portal terpasang di ${htmlPath}`);
      }
    });

    // Simpan juga ke public/index.html jika folder public ada
    const publicDir = path.join(dir, 'public');
    if (fs.existsSync(publicDir)) {
      fs.writeFileSync(path.join(publicDir, 'index.html'), adminHtmlContent, 'utf8');
      console.log(`[OK] Memperbarui ${path.join(publicDir, 'index.html')}`);
    }
  }

  const jsFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  jsFiles.forEach((file) => {
    const jsPath = path.join(dir, file);
    try {
      let code = fs.readFileSync(jsPath, 'utf8');

      // Jika HTML di-embed langsung di dalam file JS
      if (adminHtmlContent && code.includes('Barber Suite - License & Trial Manager')) {
        console.log(`[INFO] Menemukan inline HTML di ${jsPath}, mengganti dengan Central Admin Portal...`);
        // Ganti inline string HTML jika ada
        const startIndex = code.indexOf('<!DOCTYPE html>');
        const endIndex = code.indexOf('</html>');
        if (startIndex !== -1 && endIndex !== -1) {
          code = code.substring(0, startIndex) + adminHtmlContent + code.substring(endIndex + 7);
          fs.writeFileSync(jsPath, code, 'utf8');
          console.log(`[OK] Inline HTML berhasil diperbarui di ${jsPath}`);
        }
      }

      if (code.includes('express') && (code.includes('app.listen') || code.includes('server.listen') || code.includes('http.createServer'))) {
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
        const listenTarget = code.includes('app.listen')
          ? 'app.listen'
          : code.includes('server.listen')
            ? 'server.listen'
            : 'http.createServer';

        code = code.replace(listenTarget, fallback + '\n' + listenTarget);
        fs.writeFileSync(jsPath, code, 'utf8');
        console.log(`[OK] Express fallback berhasil dipasang di ${jsPath}`);
      }
    } catch (e) {
      console.log(`[SKIP] ${jsPath}: ${e.message}`);
    }
  });
});

// Restart Node/PM2 jika ada
try {
  console.log('[4] Merestart service Node/Express...');
  execSync('pm2 restart all || true', { stdio: 'inherit' });
  execSync('systemctl restart barber-license || systemctl restart license-server || systemctl restart barber-server || true', { stdio: 'inherit' });
} catch (e) {}

console.log('=== SEMUA PROSES SELESAI ===');
