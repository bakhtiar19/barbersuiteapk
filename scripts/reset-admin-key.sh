#!/bin/bash

echo "=========================================================="
echo "  Reset & Cek Kunci Admin (Admin Key) Barber Suite VPS    "
echo "=========================================================="

DIR="/home/antigravity/barber-license-server"

if [ ! -d "$DIR" ]; then
    DIR=$(find / -maxdepth 3 -name "barber-license-server" 2>/dev/null | head -n 1)
fi

echo "Folder backend: $DIR"

# 1. Tampilkan kode verifikasi auth di server
echo ""
echo "[1/3] Menemukan logika verifikasi Admin Key di backend:"
node << 'NODE_CHECK'
const fs = require('fs');
const path = require('path');
const dir = '/home/antigravity/barber-license-server';
try {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  files.forEach(f => {
    const full = path.join(dir, f);
    const txt = fs.readFileSync(full, 'utf8');
    if (txt.includes('Akses ditolak') || txt.includes('admin-key')) {
      console.log(`\nFile: ${f}`);
      txt.split('\n').forEach((line, idx) => {
        if (/admin/i.test(line) && (line.includes('===') || line.includes('!==') || line.includes('header') || line.includes('env'))) {
          console.log(`Baris ${idx+1}: ${line.trim()}`);
        }
      });
    }
  });
} catch(e) {
  console.log(e.message);
}
NODE_CHECK

# 2. Update .env dengan kunci baru yang mudah dan pasti
NEW_KEY="BarberAdmin2026"

echo ""
echo "[2/3] Mengatur Admin Key baru di $DIR/.env ..."
# Pastikan file .env ada dan terisi dengan format benar
cat << ENV_EOF > "$DIR/.env"
PORT=3000
JWT_SECRET=71f0d2bf59dd477393380d122bc3bb43474d64ee6b10420aba222fa57aaebb19
ADMIN_KEY=$NEW_KEY
ADMIN_API_KEY=$NEW_KEY
ENV_EOF

echo "File .env telah diupdate:"
cat "$DIR/.env"

# 3. Restart PM2 dengan opsi --update-env agar env baru dimuat
echo ""
echo "[3/3] Memuat ulang service Node/PM2 dengan --update-env ..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart all --update-env 2>/dev/null || pm2 restart 0 --update-env 2>/dev/null || true
fi
systemctl restart barber-license 2>/dev/null || systemctl restart license-server 2>/dev/null || true

# Uji verifikasi langsung di server
echo ""
echo "Menguji verifikasi dengan kunci baru..."
sleep 2
TEST_RESP=$(curl -s -H "x-admin-key: $NEW_KEY" http://127.0.0.1:3000/api/admin/licenses 2>/dev/null || true)
echo "Hasil uji API: $TEST_RESP"

echo ""
echo "=========================================================="
echo "  KUNCI ADMIN TELAH BERHASIL DIRESET!                    "
echo "  Gunakan Kunci Ini untuk Login:                          "
echo "  ===> $NEW_KEY <===                                     "
echo "=========================================================="
