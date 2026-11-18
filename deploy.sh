#!/bin/bash
set -e

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

# 3. Jalankan setup
echo "[2/3] Menjalankan konfigurasi Nginx & Express..."
node /tmp/setup-vps.js

# 4. Bersihkan file sementara
echo "[3/3] Membersihkan file sementara..."
rm -f /tmp/setup-vps.js

echo "=========================================================="
echo "  SELESAI! Silakan buka di browser:                       "
echo "  Aplikasi Kasir : https://202.10.35.192/barbersuite     "
echo "  Admin Lisensi  : https://202.10.35.192/                 "
echo "=========================================================="
