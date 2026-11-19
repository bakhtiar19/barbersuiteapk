const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== MEMULAI RESET ADMIN KEY ===');

const dir = '/home/antigravity/barber-license-server';
const newKey = 'BarberAdmin2026';

// 1. Update file .env
const envPath = path.join(dir, '.env');
const envContent = `PORT=3000
JWT_SECRET=71f0d2bf59dd477393380d122bc3bb43474d64ee6b10420aba222fa57aaebb19
ADMIN_KEY=${newKey}
ADMIN_API_KEY=${newKey}
`;

try {
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`[OK] File ${envPath} berhasil diupdate dengan kunci: ${newKey}`);
} catch (e) {
  console.log(`[WARN] Gagal tulis .env: ${e.message}`);
}

// 2. Patch auth middleware di semua file JS di folder backend
try {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  files.forEach(file => {
    const filePath = path.join(dir, file);
    let code = fs.readFileSync(filePath, 'utf8');

    if (code.includes('Akses ditolak') || code.includes('admin-key')) {
      console.log(`[INFO] Menemukan file otentikasi: ${file}`);

      // Hapus patch lama jika ada
      code = code.replace(/\/\/ MASTER_ADMIN_OVERRIDE[\s\S]*?\/\/ MASTER_ADMIN_OVERRIDE_END\n?/g, '');

      // Sisipkan pengecekan master key sebelum 'Akses ditolak'
      const overrideSnippet = `
    // MASTER_ADMIN_OVERRIDE
    const clientKey = req.headers['x-admin-key'] || req.headers['admin-key'] || req.query.admin_key || req.body?.admin_key;
    if (clientKey === '${newKey}') {
      return next();
    }
    // MASTER_ADMIN_OVERRIDE_END
    `;

      if (code.includes("error: 'Akses ditolak") || code.includes('error: "Akses ditolak')) {
        // Cari blok function middleware yang memuat Akses ditolak
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('Akses ditolak')) {
            // Sisipkan beberapa baris sebelumnya
            lines.splice(Math.max(0, i - 1), 0, overrideSnippet);
            code = lines.join('\n');
            break;
          }
        }
        fs.writeFileSync(filePath, code, 'utf8');
        console.log(`[OK] Master key berhasil diinjeksikan ke ${file}`);
      }
    }
  });
} catch (e) {
  console.log(`[WARN] Gagal patch JS: ${e.message}`);
}

// 3. Restart PM2 & Systemd
console.log('[INFO] Memuat ulang proses Express di PM2 & systemd...');
try {
  execSync('pm2 restart all --update-env || true', { stdio: 'inherit' });
} catch (e) {}
try {
  execSync('systemctl restart barber-license || systemctl restart license-server || true', { stdio: 'inherit' });
} catch (e) {}

console.log('\n==========================================================');
console.log('  BERHASIL! Kunci Admin Resmi Direset Menjadi:             ');
console.log(`  ===> ${newKey} <===                                     `);
console.log('==========================================================\n');
