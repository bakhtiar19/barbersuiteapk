const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==========================================================');
console.log('  PENCARIAN & PEMULIHAN DATABASE LISENSI & TRIAL VPS      ');
console.log('==========================================================');

const targetDir = '/home/antigravity/barber-license-server/data';
const targetFile = path.join(targetDir, 'barber_licenses.json');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Scan semua file JSON yang ada di sistem
let allJsonFiles = [];
try {
  const out = execSync('find /home/antigravity /root /var/www -maxdepth 5 -name "*.json" 2>/dev/null', { encoding: 'utf8' });
  allJsonFiles = out.split('\n').map((s) => s.trim()).filter(Boolean);
} catch (e) {}

let bestFile = null;
let maxCount = -1;
let bestData = null;

console.log('>> Memeriksa file database yang ditemukan:');
allJsonFiles.forEach((f) => {
  if (f.includes('node_modules') || f.includes('package.json') || f.includes('package-lock') || f.includes('tsconfig')) {
    return;
  }
  try {
    const raw = fs.readFileSync(f, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && (Array.isArray(parsed.licenses) || Array.isArray(parsed.trials))) {
      const licCount = Array.isArray(parsed.licenses) ? parsed.licenses.length : 0;
      const trialCount = Array.isArray(parsed.trials) ? parsed.trials.length : 0;
      const total = licCount + trialCount;
      console.log(`   [+] ${f} -> ${licCount} Lisensi, ${trialCount} Trial (Total: ${total})`);

      if (total > maxCount && f !== targetFile) {
        maxCount = total;
        bestFile = f;
        bestData = parsed;
      }
    }
  } catch (err) {}
});

if (bestFile && bestData) {
  console.log('\n>> MENYAMBUNGKAN DATABASE:');
  console.log(`   Sumber data terbaik: ${bestFile}`);
  console.log(`   Target file        : ${targetFile}`);

  // Backup target lama jika ada
  if (fs.existsSync(targetFile)) {
    fs.copyFileSync(targetFile, targetFile + '.bak.' + Date.now());
  }

  // Tulis data lengkap
  fs.writeFileSync(targetFile, JSON.stringify(bestData, null, 2), 'utf8');
  console.log('   [OK] File database berhasil ditulis.');

  // Set izin akses
  try {
    execSync('chown -R antigravity:antigravity /home/antigravity/barber-license-server 2>/dev/null || true');
    execSync('chmod -R 755 /home/antigravity/barber-license-server 2>/dev/null || true');
  } catch (e) {}

  // Restart PM2
  console.log('\n>> Merestart service PM2 (barber-license-server)...');
  try {
    execSync('pm2 restart barber-license-server --update-env 2>/dev/null || su - antigravity -c "pm2 restart barber-license-server --update-env" 2>/dev/null || true', { stdio: 'inherit' });
  } catch (e) {}

  console.log('\n==========================================================');
  console.log(`  [BERHASIL!] ${bestData.licenses?.length || 0} Lisensi & ${bestData.trials?.length || 0} Trial Terhubung!`);
  console.log('  Buka & refresh di: https://admin.barbersuite.site        ');
  console.log('==========================================================');
} else {
  console.log('\n[INFO] Tidak ditemukan file database lain yang memiliki data lebih banyak.');
  console.log('File aktif saat ini:', targetFile);
}
