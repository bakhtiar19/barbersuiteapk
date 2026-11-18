#!/bin/bash
set -e

echo "=========================================="
echo "  Deploy Otomatis Barber Suite Web (PWA)  "
echo "=========================================="

# 1. Update paket dasar
apt-get update -y
apt-get install -y nginx unzip curl git

# 2. Buat folder web
mkdir -p /var/www/barbersuite

# 3. Ambil file web zip dari GitHub dan ekstrak
echo "[1/3] Mengunduh dan mengekstrak file website..."
curl -sSL -o /tmp/barbersuite.zip https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/barber-suite-website.zip
unzip -o /tmp/barbersuite.zip -d /var/www/barbersuite
rm -f /tmp/barbersuite.zip

# 4. Konfigurasi Nginx
echo "[2/3] Mengonfigurasi Nginx..."
cat << 'EOF' > /etc/nginx/sites-available/barbersuite
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/barbersuite;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.wasm$ {
        types { application/wasm wasm; }
        default_type application/wasm;
    }
}
EOF

# 5. Aktifkan site & restart Nginx
echo "[3/3] Mengaktifkan website di Nginx..."
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/barbersuite /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

echo "=========================================="
echo "  BERHASIL! Website kasir sudah aktif.    "
echo "  Buka di browser: http://202.10.35.192   "
echo "=========================================="
