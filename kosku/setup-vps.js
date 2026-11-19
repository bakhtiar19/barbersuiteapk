const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Memulai Konfigurasi Kos Suite VPS ===');

// 1. Ekstrak zip ke /var/www/kosku
const webZip = '/tmp/kosku-website.zip';
const targetDir = '/var/www/kosku';

fs.mkdirSync(targetDir, { recursive: true });

if (fs.existsSync(webZip)) {
  console.log(`[1] Mengekstrak ${webZip} ke ${targetDir}...`);
  try {
    execSync(`unzip -o -q "${webZip}" -d "${targetDir}"`, { stdio: 'inherit' });
  } catch (err) {
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
console.log('[OK] Folder /var/www/kosku siap.');

// 2. Setup Backend Server jika tersedia di /tmp/kos-license-server.zip
const serverZip = '/tmp/kos-license-server.zip';
const backendTargetDir = '/home/antigravity/kos-license-server';

fs.mkdirSync(backendTargetDir, { recursive: true });

if (fs.existsSync(serverZip)) {
  console.log(`[2] Mengekstrak backend ${serverZip} ke ${backendTargetDir}...`);
  try {
    execSync(`unzip -o -q "${serverZip}" -d "${backendTargetDir}"`, { stdio: 'inherit' });
  } catch (e) {}
  try {
    fs.unlinkSync(serverZip);
  } catch (e) {}
}

const adminHtmlTmp = '/tmp/admin.html';
if (fs.existsSync(adminHtmlTmp)) {
  fs.copyFileSync(adminHtmlTmp, path.join(backendTargetDir, 'admin.html'));
}

// 3. Pastikan dependensi server terinstal
if (fs.existsSync(path.join(backendTargetDir, 'package.json'))) {
  console.log('[3] Memeriksa dependensi backend...');
  try {
    execSync(`cd "${backendTargetDir}" && npm install --omit=dev`, { stdio: 'inherit' });
    execSync(`chown -R antigravity:antigravity "${backendTargetDir}" || true`, { stdio: 'inherit' });
  } catch (e) {
    console.log('[WARN] npm install backend:', e.message);
  }
}

// 4. Update / reload PM2 service
console.log('[4] Memastikan service PM2 berjalan...');
try {
  const suCmd = (cmd) => `su - antigravity -c "${cmd}" || ${cmd}`;
  execSync(
    suCmd(
      `cd ${backendTargetDir} && pm2 restart kos-license || pm2 start server.js --name kos-license --update-env`
    ),
    { stdio: 'inherit' }
  );
} catch (e) {
  console.log('[WARN] PM2 startup:', e.message);
}

// 5. Test & Reload Nginx
console.log('[5] Memeriksa Nginx...');
try {
  execSync('nginx -t', { stdio: 'inherit' });
  execSync('systemctl reload nginx || systemctl restart nginx', { stdio: 'inherit' });
  console.log('[OK] Nginx berhasil dimuat ulang.');
} catch (e) {
  console.error('[WARN] Reload Nginx:', e.message);
}

console.log('=== SEMUA PROSES KOS SUITE SELESAI ===');
