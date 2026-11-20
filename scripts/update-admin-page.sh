#!/bin/bash
set -e

echo "Mengunduh pembaruan Admin Portal & Backend Barber Suite..."
curl -sSL -o /tmp/admin.html https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/scripts/admin.html
curl -sSL -o /tmp/server.js https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/scripts/server.js

DIR="/home/antigravity/barber-license-server"

# Pasang ke public/index.html dan index.html
mkdir -p "$DIR/public"
cp /tmp/admin.html "$DIR/public/index.html"
cp /tmp/admin.html "$DIR/index.html" 2>/dev/null || true
echo "[OK] Template HTML di $DIR diperbarui."

# Pasang server.js jika folder backend ada, pertahankan .env dan data/
if [ -d "$DIR" ]; then
    cp "$DIR/server.js" "$DIR/server.js.bak" 2>/dev/null || true
    sed 's/PORT || .3001./PORT || "3000"/g' /tmp/server.js > "$DIR/server.js"
    echo "[OK] Backend server.js di $DIR diperbarui."
fi

rm -f /tmp/admin.html /tmp/server.js

# Reload process
su - antigravity -c "pm2 restart all --update-env" 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
sleep 1
if ! ss -tulpn 2>/dev/null | grep -q ":3000"; then
    su - antigravity -c "cd /home/antigravity/barber-license-server && pm2 start server.js --update-env" 2>/dev/null || \
    (cd /home/antigravity/barber-license-server && nohup node server.js > /var/log/barber-server.log 2>&1 &)
fi

echo ""
echo "=========================================================="
echo "  BERHASIL! Admin Portal & Server Barber Suite Diperbarui "
echo "  Buka di: https://admin.barbersuite.site                 "
echo "=========================================================="
