#!/bin/bash

echo "=========================================================="
echo "  Deploy Barber Suite Web ke /barbersuite (VPS)           "
echo "=========================================================="

# 1. Pastikan paket dasar & nodejs terpasang
apt-get update -y
apt-get install -y nginx unzip curl nodejs

# 2. Unduh bundle web dan skrip setup
echo "[1/3] Mengunduh bundle aplikasi dan file setup..."
curl -sSL -o /tmp/barber-suite-website.zip https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/barber-suite-website.zip
curl -sSL -o /tmp/setup-vps.js https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/scripts/setup-vps.js

# 3. Ekstrak langsung dengan aman
echo "[2/3] Mengekstrak file web..."
mkdir -p /var/www/barbersuite
unzip -o -q /tmp/barber-suite-website.zip -d /var/www/barbersuite || true
rm -f /tmp/barber-suite-website.zip
chown -R www-data:www-data /var/www/barbersuite 2>/dev/null || true
chmod -R 755 /var/www/barbersuite

# 4. Jalankan konfigurasi Nginx & Express via Node
echo "[3/3] Menjalankan konfigurasi Nginx & Express..."
node /tmp/setup-vps.js
rm -f /tmp/setup-vps.js

echo "=========================================================="
echo "  SELESAI! Silakan buka di browser:                       "
echo "  Aplikasi Kasir : https://202.10.35.192/barbersuite     "
echo "  Admin Lisensi  : https://202.10.35.192/                 "
echo "=========================================================="
