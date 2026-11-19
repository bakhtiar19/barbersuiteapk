#!/bin/bash
set -e

echo "=========================================================="
echo "  Setup Domain barbersuite.site & Pasang SSL Let's Encrypt "
echo "=========================================================="

# 1. Tampilkan Kunci Admin yang tersimpan
echo ""
echo "[1/4] Mencari Admin Key yang tersimpan di server..."
if [ -f "/home/antigravity/barber-license-server/.env" ]; then
    echo ">> Ditemukan file .env:"
    cat /home/antigravity/barber-license-server/.env
    echo ""
fi
echo ">> Mencari di file konfigurasi server..."
grep -rniE "BarberMaster|ADMIN_KEY|admin_key" /home/antigravity/barber-license-server/ 2>/dev/null | head -n 5 || true
echo ""

# 2. Deteksi port backend Node.js Express
echo "[2/4] Mendeteksi port Express License Server..."
NODE_PORT=$(ss -tulpn 2>/dev/null | grep -E "node" | grep -oP ':\K[0-9]+' | head -n 1)
if [ -z "$NODE_PORT" ]; then
    NODE_PORT=3000
fi
echo ">> Backend terdeteksi pada port: $NODE_PORT"

# 3. Konfigurasi Nginx untuk domain barbersuite.site
echo "[3/4] Mengonfigurasi Nginx untuk barbersuite.site & www.barbersuite.site..."
cat << 'EOF' > /etc/nginx/sites-available/barbersuite.site
server {
    listen 80;
    listen [::]:80;
    server_name barbersuite.site www.barbersuite.site;

    root /var/www/barbersuite;
    index index.html;

    # Aplikasi Kasir Barber Suite di root /
    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.wasm$ {
        types { application/wasm wasm; }
        default_type application/wasm;
    }

    # API Proxy ke License Server backend
    location /api/ {
        proxy_pass http://127.0.0.1:NODE_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Central Admin Portal di /admin
    location /admin {
        proxy_pass http://127.0.0.1:NODE_PORT_PLACEHOLDER/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sed -i "s/NODE_PORT_PLACEHOLDER/$NODE_PORT/g" /etc/nginx/sites-available/barbersuite.site

ln -sf /etc/nginx/sites-available/barbersuite.site /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 4. Pasang SSL resmi gratis Let's Encrypt via Certbot
echo "[4/4] Memasang Sertifikat SSL Resmi (Let's Encrypt)..."
apt-get update -y
apt-get install -y certbot python3-certbot-nginx

# Request certificate dan pasang otomatis ke Nginx
certbot --nginx -d barbersuite.site -d www.barbersuite.site --non-interactive --agree-tos --register-unsafely-without-email --redirect || \
certbot --nginx -d barbersuite.site --non-interactive --agree-tos --register-unsafely-without-email --redirect

systemctl reload nginx

echo ""
echo "=========================================================="
echo "  BERHASIL! Domain & SSL Resmi Telah Terpasang!          "
echo "  1. Aplikasi Kasir : https://barbersuite.site (Aman/SSL)"
echo "  2. Admin Portal   : https://barbersuite.site/admin     "
echo "=========================================================="
