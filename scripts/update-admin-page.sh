#!/bin/bash
set -e

echo "Mengunduh template Admin Portal khusus Barber Suite..."
curl -sSL -o /tmp/admin.html https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/scripts/admin.html

DIR="/home/antigravity/barber-license-server"

# Pasang ke public/index.html dan index.html
mkdir -p "$DIR/public"
cp /tmp/admin.html "$DIR/public/index.html"
cp /tmp/admin.html "$DIR/index.html" 2>/dev/null || true
echo "[OK] Template HTML di $DIR diperbarui."

# Periksa apakah ada inline HTML di server.js
node << 'NODE_UPDATE'
const fs = require('fs');
const path = '/home/antigravity/barber-license-server/server.js';
try {
    if (fs.existsSync(path)) {
        let code = fs.readFileSync(path, 'utf8');
        const newHtml = fs.readFileSync('/tmp/admin.html', 'utf8');
        const start = code.indexOf('<!DOCTYPE html>');
        const end = code.indexOf('</html>');
        if (start !== -1 && end !== -1) {
            code = code.substring(0, start) + newHtml + code.substring(end + 7);
            fs.writeFileSync(path, code, 'utf8');
            console.log('[OK] Inline HTML di server.js diperbarui.');
        }
    }
} catch(e) {
    console.log(e.message);
}
NODE_UPDATE

rm -f /tmp/admin.html

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
echo "  BERHASIL! Admin Portal kini khusus untuk Barber Suite   "
echo "  Buka di: https://admin.barbersuite.site                 "
echo "=========================================================="
