#!/bin/bash
set -e

echo "=========================================================="
echo "  Deploy Kos Suite Web & License Server (VPS)             "
echo "=========================================================="

# 1. Pastikan paket dasar, nodejs & certbot terpasang
apt-get update -y
apt-get install -y nginx unzip curl nodejs npm certbot python3-certbot-nginx

# 2. Unduh bundle aplikasi dan file setup dari public repo
echo "[1/4] Mengunduh bundle aplikasi dan file setup..."
curl -sSL -o /tmp/kosku-website.zip https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/kosku/kosku-website.zip
curl -sSL -o /tmp/setup-vps.js https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/kosku/setup-vps.js
curl -sSL -o /tmp/setup-kos-and-admin.sh https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/kosku/setup-kos-and-admin.sh
curl -sSL -o /tmp/admin.html https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/kosku/admin.html
curl -sSL -o /tmp/kos-license-server.zip https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/kosku/kos-license-server.zip

# 3. Jalankan setup Nginx & SSL
if [ -f /tmp/setup-kos-and-admin.sh ]; then
    echo "[2/4] Menjalankan konfigurasi domain & SSL..."
    bash /tmp/setup-kos-and-admin.sh
    rm -f /tmp/setup-kos-and-admin.sh
fi

# 4. Jalankan konfigurasi website & backend
if [ -f /tmp/setup-vps.js ]; then
    echo "[3/4] Menjalankan ekstraksi web & service..."
    node /tmp/setup-vps.js
    rm -f /tmp/setup-vps.js /tmp/admin.html
fi

echo ""
echo "=========================================================="
echo "  BERHASIL! Silakan buka di browser:                      "
echo "  Aplikasi Kos  : https://kossuite.site                   "
echo "  Admin Portal  : https://admin.kossuite.site             "
echo "=========================================================="
