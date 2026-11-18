#!/bin/bash
set -e

echo "=========================================================="
echo "  Deploy Barber Suite Web ke /barbersuite (VPS KVM)       "
echo "=========================================================="

# 1. Update paket dasar jika belum ada
apt-get update -y
apt-get install -y nginx unzip curl

# 2. Buat folder web /var/www/barbersuite
echo "[1/4] Menyiapkan folder /var/www/barbersuite..."
mkdir -p /var/www/barbersuite

# 3. Download dan ekstrak file web Barber Suite
echo "[2/4] Mengunduh bundle website terbaru dari GitHub..."
curl -sSL -o /tmp/barber-suite-website.zip https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/barber-suite-website.zip
unzip -o /tmp/barber-suite-website.zip -d /var/www/barbersuite
rm -f /tmp/barber-suite-website.zip

# Set permission
chown -R www-data:www-data /var/www/barbersuite
chmod -R 755 /var/www/barbersuite

# 4. Tambahkan rute /barbersuite ke konfigurasi Nginx yang sedang aktif
echo "[3/4] Mendaftarkan rute /barbersuite ke Nginx..."

FOUND_CONF=0
for CONF in /etc/nginx/sites-enabled/*; do
    if [ -f "$CONF" ]; then
        # Hapus konfigurasi barbersuite lama jika ada agar bersih
        sed -i '/# BARBERSUITE_START/,/# BARBERSUITE_END/d' "$CONF"

        # Sisipkan rute /barbersuite tepat sebelum location / {
        if grep -q "location / {" "$CONF"; then
            FOUND_CONF=1
            echo "Menambahkan rute ke $CONF..."
            sed -i '/location \/ {/i \
    # BARBERSUITE_START\
    location /barbersuite {\
        root /var/www;\
        index index.html;\
        try_files $uri $uri/ /barbersuite/index.html;\
    }\
    location ~* /barbersuite/.*\\.wasm$ {\
        root /var/www;\
        types { application/wasm wasm; }\
        default_type application/wasm;\
    }\
    # BARBERSUITE_END' "$CONF"
        fi
    fi
done

# Jika tidak ditemukan location / di sites-enabled, buat konfigurasi baru
if [ "$FOUND_CONF" -eq 0 ]; then
    echo "Membuat konfigurasi /etc/nginx/sites-available/barbersuite..."
    cat << 'EOF' > /etc/nginx/sites-available/barbersuite
server {
    listen 80;
    listen [::]:80;
    server_name _;

    location /barbersuite {
        root /var/www;
        index index.html;
        try_files $uri $uri/ /barbersuite/index.html;
    }

    location ~* /barbersuite/.*\.wasm$ {
        root /var/www;
        types { application/wasm wasm; }
        default_type application/wasm;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/barbersuite /etc/nginx/sites-enabled/
fi

# 5. Uji konfigurasi & reload Nginx
echo "[4/4] Memeriksa konfigurasi Nginx & menerapkan..."
nginx -t
systemctl reload nginx || systemctl restart nginx

echo "=========================================================="
echo "  BERHASIL! Susunan alamat di VPS Mas sekarang:           "
echo "  1. Halaman Utama: https://202.10.35.192/ (Dashboard Admin Lisensi)"
echo "  2. Aplikasi Kasir: https://202.10.35.192/barbersuite    "
echo "  3. Kos Suite (Next): https://202.10.35.192/kossuite     "
echo "=========================================================="
