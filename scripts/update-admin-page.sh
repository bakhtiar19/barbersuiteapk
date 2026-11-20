#!/bin/bash
set -e

echo "=========================================================="
echo "  Memperbarui Admin Portal & Backend Barber Suite (VPS)   "
echo "=========================================================="

DIR="/home/antigravity/barber-license-server"
if [ ! -d "$DIR" ]; then
    DIR=$(find / -maxdepth 3 -name "barber-license-server" 2>/dev/null | head -n 1)
fi

if [ -z "$DIR" ] || [ ! -d "$DIR" ]; then
    echo "[ERROR] Folder barber-license-server tidak ditemukan di VPS!"
    exit 1
fi

echo ">> Folder backend: $DIR"

# 1. Pastikan .env terdefinisi dengan benar
cat << 'EOF' > "$DIR/.env"
PORT=3000
ADMIN_KEY=BarberAdmin2026
ADMIN_API_KEY=BarberAdmin2026
JWT_SECRET=barber_suite_master_jwt_secret_71f0d2bf59dd477393380d122bc3bb43474
EOF

# 2. Unduh template HTML admin dan server backend Barber Suite
echo ">> Mengunduh update terbaru dari GitHub..."
REPO="mukhlisprasetyotyo-hue/barber-suite-final"
curl -sSL -o "$DIR/public/index.html" "https://raw.githubusercontent.com/$REPO/main/scripts/admin.html" || curl -sSL -o "$DIR/public/index.html" "https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/scripts/admin.html"
cp "$DIR/public/index.html" "$DIR/index.html" 2>/dev/null || true
cp "$DIR/public/index.html" "$DIR/admin.html" 2>/dev/null || true
echo "[OK] Tampilan Admin Portal diperbarui di $DIR"

# 3. Pasang server.js Barber Suite
curl -sSL -o "$DIR/server.js" "https://raw.githubusercontent.com/$REPO/main/scripts/server.js" || curl -sSL -o "$DIR/server.js" "https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/scripts/server.js"
echo "[OK] Script backend server.js diperbarui."

# 4. Berikan izin akses ke user antigravity
if id -u antigravity >/dev/null 2>&1; then
    chown -R antigravity:antigravity "$DIR"
fi
chmod -R 755 "$DIR"

# 5. Bersihkan instance PM2 yang bentrok / duplikat dan restart
echo ">> Menata ulang proses PM2..."
if id -u antigravity >/dev/null 2>&1; then
    su - antigravity -c "pm2 delete server 2>/dev/null || true"
    su - antigravity -c "pm2 delete barber-license-server 2>/dev/null || true"
    su - antigravity -c "pm2 delete barber-server 2>/dev/null || true"
    su - antigravity -c "cd $DIR && PORT=3000 pm2 start server.js --name barber-license-server --update-env"
    su - antigravity -c "pm2 save"
else
    pm2 delete server 2>/dev/null || true
    pm2 delete barber-license-server 2>/dev/null || true
    pm2 delete barber-server 2>/dev/null || true
    cd "$DIR" && PORT=3000 pm2 start server.js --name barber-license-server --update-env
    pm2 save
fi

sleep 2

# 6. Reload Nginx
echo ">> Mereload Nginx..."
systemctl reload nginx 2>/dev/null || true

# 7. Tes respon HTTP port 3000
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ || echo "FAIL")

echo ""
echo "=========================================================="
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "304" ]; then
    echo "  STATUS: [SUKSES BERJALAN] Port 3000 Aktif Normal!       "
    echo "  Portal Admin : https://admin.barbersuite.site           "
    echo "  Kunci Admin  : BarberAdmin2026                          "
else
    echo "  STATUS: [PERINGATAN] Port 3000 respon HTTP: $HTTP_CODE  "
    echo "  Log error terakhir:"
    if id -u antigravity >/dev/null 2>&1; then
        su - antigravity -c "pm2 logs barber-license-server --lines 15 --nostream" || true
    fi
fi
echo "=========================================================="
