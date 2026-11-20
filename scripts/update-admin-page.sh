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

# 1. Unduh template HTML admin dan server backend Barber Suite
echo ">> Mengunduh update terbaru dari GitHub..."
curl -sSL -o /tmp/admin.html https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/scripts/admin.html
curl -sSL -o /tmp/server.js https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/scripts/server.js

# 2. Pasang template admin.html ke semua lokasi yang mungkin disajikan
mkdir -p "$DIR/public"
cp /tmp/admin.html "$DIR/public/index.html"
cp /tmp/admin.html "$DIR/index.html"
cp /tmp/admin.html "$DIR/admin.html"
echo "[OK] Tampilan Admin Portal diperbarui di $DIR"

# 3. Pasang server.js Barber Suite (Port 3000, zero-dependency CORS)
cp "$DIR/server.js" "$DIR/server.js.bak" 2>/dev/null || true
cp /tmp/server.js "$DIR/server.js"
echo "[OK] Script backend server.js diperbarui."

rm -f /tmp/admin.html /tmp/server.js

# 4. Pastikan file permission dimiliki oleh user antigravity
if id -u antigravity >/dev/null 2>&1; then
    chown -R antigravity:antigravity "$DIR" 2>/dev/null || true
fi
chmod -R 755 "$DIR" 2>/dev/null || true

# 5. Hentikan node lama dan jalankan ulang
echo ">> Memuat ulang proses Node.js..."
pkill -f "node.*server.js" 2>/dev/null || true
sleep 1

if id -u antigravity >/dev/null 2>&1; then
    su - antigravity -c "pm2 restart all --update-env 2>/dev/null || (cd $DIR && pm2 start server.js --name barber-server --update-env)" 2>/dev/null || true
else
    pm2 restart all --update-env 2>/dev/null || (cd "$DIR" && pm2 start server.js --name barber-server --update-env) 2>/dev/null || true
fi

sleep 2

# Fallback jika port 3000 belum aktif
if ! ss -tulpn 2>/dev/null | grep -q ":3000"; then
    echo ">> Memulai langsung via background process..."
    if id -u antigravity >/dev/null 2>&1; then
        su - antigravity -c "cd $DIR && nohup node server.js > /var/log/barber-server.log 2>&1 &"
    else
        (cd "$DIR" && nohup node server.js > /var/log/barber-server.log 2>&1 &)
    fi
    sleep 2
fi

# 6. Reload Nginx
echo ">> Mereload Nginx..."
systemctl reload nginx 2>/dev/null || true

echo ""
echo "=========================================================="
if ss -tulpn 2>/dev/null | grep -q ":3000"; then
    echo "  STATUS: [SUKSES BERJALAN] Port 3000 Aktif Normal!       "
    echo "  Portal Admin : https://admin.barbersuite.site           "
    echo "  Kasir Web    : https://barbersuite.site                 "
else
    echo "  STATUS: [PERINGATAN] Port 3000 belum menyala!           "
    echo "  Cek log error dengan perintah: cat /var/log/barber-server.log"
fi
echo "=========================================================="
