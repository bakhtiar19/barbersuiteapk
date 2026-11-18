#!/bin/bash
set -e

echo "=========================================================="
echo "  Deploy Barber Suite Web ke /barbersuite (VPS)           "
echo "=========================================================="

# 1. Update paket dasar
apt-get update -y
apt-get install -y nginx unzip curl nodejs

# 2. Buat folder web /var/www/barbersuite
echo "[1/4] Menyiapkan folder /var/www/barbersuite..."
mkdir -p /var/www/barbersuite

# 3. Download dan ekstrak file web Barber Suite
echo "[2/4] Mengunduh bundle website terbaru dari GitHub..."
curl -sSL -o /tmp/barber-suite-website.zip https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/barber-suite-website.zip
unzip -o /tmp/barber-suite-website.zip -d /var/www/barbersuite
rm -f /tmp/barber-suite-website.zip

chown -R www-data:www-data /var/www/barbersuite
chmod -R 755 /var/www/barbersuite

# 4. Modifikasi Nginx secara presisi menggunakan Node.js
echo "[3/4] Mendaftarkan rute /barbersuite ke konfigurasi Nginx..."

node << 'NODE_SCRIPT'
const fs = require('fs');
const path = require('path');
const globDirs = ['/etc/nginx/sites-enabled', '/etc/nginx/conf.d'];

const barberBlock = `
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

let injectedCount = 0;

globDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        try {
            const stat = fs.statSync(fullPath);
            if (!stat.isFile()) return;

            let content = fs.readFileSync(fullPath, 'utf8');

            // Hapus blok barbersuite lama jika ada
            content = content.replace(/# BARBERSUITE_START[\s\S]*?# BARBERSUITE_END\n?/g, '');

            // Sisipkan sebelum setiap 'location / {' atau 'location / {'
            if (/location\s+\/\s*\{/.test(content)) {
                content = content.replace(/location\s+\/\s*\{/g, barberBlock + '\n    location / {');
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`[OK] Berhasil menambahkan /barbersuite ke ${fullPath}`);
                injectedCount++;
            }
        } catch (err) {
            console.error(`Gagal memproses ${fullPath}:`, err.message);
        }
    });
});

console.log(`Total konfigurasi Nginx terupdate: ${injectedCount}`);
NODE_SCRIPT

# Uji Nginx
nginx -t
systemctl reload nginx || systemctl restart nginx
echo "[OK] Nginx berhasil direload."

# 5. Patch Express License Server sebagai cadangan lapis kedua (Fallback)
echo "[4/4] Memeriksa Express License Server..."
node << 'EXPRESS_FALLBACK'
const fs = require('fs');
const path = require('path');

const candidatePaths = [
    '/home/antigravity/barber-license-server/server.js',
    '/home/antigravity/barber-license-server/index.js',
    '/home/antigravity/barber-license-server/app.js',
    '/root/barber-license-server/server.js',
    '/root/barber-license-server/index.js'
];

candidatePaths.forEach(target => {
    if (fs.existsSync(target)) {
        try {
            let code = fs.readFileSync(target, 'utf8');
            if (!code.includes("app.use('/barbersuite'")) {
                code = code.replace(/# BARBERSUITE_FALLBACK[\s\S]*?# BARBERSUITE_FALLBACK_END\n?/g, '');
                
                const fallbackSnippet = `
// BARBERSUITE_FALLBACK
app.use('/barbersuite', express.static('/var/www/barbersuite'));
app.get('/barbersuite*', (req, res) => {
    res.sendFile(path.join('/var/www/barbersuite', 'index.html'));
});
// BARBERSUITE_FALLBACK_END
`;
                // Cari posisi setelah express() dibuat atau sebelum app.listen
                if (code.includes('app.listen')) {
                    code = code.replace('app.listen', fallbackSnippet + '\napp.listen');
                    fs.writeFileSync(target, code, 'utf8');
                    console.log(`[OK] Fallback Express ditambahkan ke ${target}`);
                }
            }
        } catch (e) {
            console.error(`Gagal patch Express: ${e.message}`);
        }
    }
});
EXPRESS_FALLBACK

# Restart PM2 jika ada
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart all 2>/dev/null || true
fi

echo "=========================================================="
echo "  SELESAI! Silakan buka di browser:                       "
echo "  Aplikasi Kasir : https://202.10.35.192/barbersuite     "
echo "  Admin Lisensi  : https://202.10.35.192/                 "
echo "=========================================================="
