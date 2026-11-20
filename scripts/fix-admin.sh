#!/bin/bash

echo "=========================================================="
echo "  Perbaikan PM2 & Port 3000 Barber Suite (VPS)            "
echo "=========================================================="

DIR="/home/antigravity/barber-license-server"
if [ ! -d "$DIR" ]; then
    DIR=$(find / -maxdepth 3 -name "barber-license-server" 2>/dev/null | head -n 1)
fi

if [ -z "$DIR" ] || [ ! -d "$DIR" ]; then
    echo "[ERROR] Folder barber-license-server tidak ditemukan di VPS!"
    exit 1
fi

echo ">> Direktori backend: $DIR"

# 1. Pastikan isi .env terdefinisi dengan PORT=3000
echo ">> Menyetel PORT=3000 & ADMIN_KEY di $DIR/.env ..."
cat << 'EOF' > "$DIR/.env"
PORT=3000
ADMIN_KEY=BarberAdmin2026
ADMIN_API_KEY=BarberAdmin2026
JWT_SECRET=barber_suite_master_jwt_secret_71f0d2bf59dd477393380d122bc3bb43474
EOF

mkdir -p "$DIR/public"
mkdir -p "$DIR/data"

# 2. Perbarui template HTML admin
echo ">> Memperbarui admin.html..."
curl -fsSL -o "$DIR/public/index.html" "https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/scripts/admin.html" || \
curl -fsSL -o "$DIR/public/index.html" "https://raw.githubusercontent.com/mukhlisprasetyotyo-hue/barber-suite-final/main/scripts/admin.html"
cp "$DIR/public/index.html" "$DIR/index.html" 2>/dev/null || true
cp "$DIR/public/index.html" "$DIR/admin.html" 2>/dev/null || true

# 3. Perbarui server.js Barber Suite
echo ">> Memperbarui server.js..."
curl -fsSL -o "$DIR/server.js" "https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/scripts/server.js" || \
curl -fsSL -o "$DIR/server.js" "https://raw.githubusercontent.com/mukhlisprasetyotyo-hue/barber-suite-final/main/scripts/server.js"

if node -c "$DIR/server.js" 2>/dev/null; then
    echo "[OK] Script backend server.js valid dan siap dijalankan."
else
    echo "[FATAL] server.js tidak valid syntax!"
    node -c "$DIR/server.js" || true
    exit 1
fi

# 4. Berikan izin akses ke user antigravity
if id -u antigravity >/dev/null 2>&1; then
    chown -R antigravity:antigravity "$DIR"
fi
chmod -R 755 "$DIR"

# 5. Bebaskan port 3000 jika ada proses yang menggantung
fuser -k 3000/tcp 2>/dev/null || true

# 6. Bersihkan proses PM2 yang bentrok / duplikat
echo ">> Menata ulang proses PM2..."
if id -u antigravity >/dev/null 2>&1; then
    su - antigravity -c "pm2 delete server 2>/dev/null || true"
    su - antigravity -c "pm2 delete barber-license-server 2>/dev/null || true"
    su - antigravity -c "pm2 delete barber-server 2>/dev/null || true"
    su - antigravity -c "cd $DIR && PORT=3000 pm2 start server.js --name barber-license-server"
    su - antigravity -c "pm2 save"
fi

pm2 delete server 2>/dev/null || true
pm2 delete barber-license-server 2>/dev/null || true
pm2 delete barber-server 2>/dev/null || true
cd "$DIR" && PORT=3000 pm2 start server.js --name barber-license-server
pm2 save

sleep 2

# 7. Reload Nginx
echo ">> Mereload Nginx..."
systemctl reload nginx 2>/dev/null || true

# 8. Cek Port 3000
echo ""
echo ">> Mengecek port aktif:"
ss -tulpn | grep -E "3000|3001|node" || true

echo ""
echo ">> Menguji respon server:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ || echo "FAIL")
echo "HTTP Status Code Port 3000: $HTTP_CODE"

echo ""
echo "=========================================================="
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "304" ]; then
    echo "  BERHASIL! Service Port 3000 Aktif Normal (HTTP 200)     "
    echo "  Buka di Browser: https://admin.barbersuite.site         "
    echo "  Kunci Admin    : BarberAdmin2026                        "
else
    echo "  STATUS: [PERINGATAN] Port 3000 respon HTTP: $HTTP_CODE  "
    echo "  Log error terakhir:"
    pm2 logs barber-license-server --lines 15 --nostream 2>/dev/null || true
fi
echo "=========================================================="
