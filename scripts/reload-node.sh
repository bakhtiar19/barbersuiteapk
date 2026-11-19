#!/bin/bash

echo "=========================================================="
echo "  Memuat Ulang Service Node.js (Barber License Server)    "
echo "=========================================================="

echo "[1/3] Merestart PM2 milik user antigravity..."
su - antigravity -c "pm2 restart all --update-env" 2>/dev/null || true

echo "[2/3] Memastikan proses node lama dimuat ulang..."
pkill -f "node.*server.js" 2>/dev/null || pkill -f "node.*barber" 2>/dev/null || true
sleep 2

# Jika node belum aktif di port 3000, jalankan kembali
if ! ss -tulpn 2>/dev/null | grep -q ":3000"; then
    echo "Menjalankan ulang server.js..."
    su - antigravity -c "cd /home/antigravity/barber-license-server && pm2 start server.js --update-env" 2>/dev/null || \
    (cd /home/antigravity/barber-license-server && nohup node server.js > /var/log/barber-server.log 2>&1 &)
fi

sleep 2

echo "[3/3] Menguji login dengan kunci BarberAdmin2026..."
RESP=$(curl -s -H "x-admin-key: BarberAdmin2026" http://127.0.0.1:3000/api/admin/licenses 2>/dev/null || true)
echo "Hasil uji server: $RESP"

echo ""
echo "=========================================================="
echo "  SELESAI! Silakan login di: https://admin.barbersuite.site"
echo "  Kunci: BarberAdmin2026                                  "
echo "=========================================================="
