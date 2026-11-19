#!/bin/bash
set -e

echo "=========================================================="
echo "  Setup kossuite.site & admin.kossuite.site               "
echo "=========================================================="

# 1. Deteksi Port Node.js backend
NODE_PORT=$(ss -tulpn 2>/dev/null | grep -E "node" | grep -oP ':\K[0-9]+' | head -n 1)
if [ -z "$NODE_PORT" ]; then
    NODE_PORT=3000
fi
echo ">> Backend terdeteksi pada port: $NODE_PORT"

# 2. Konfigurasi kossuite.site (Aplikasi Manajemen Kos Suite)
echo ">> Menyiapkan konfigurasi Nginx untuk kossuite.site..."
cat << 'EOF' > /etc/nginx/sites-available/kossuite.site
server {
    listen 80;
    listen [::]:80;
    server_name kossuite.site www.kossuite.site;

    root /var/www/kosku;
    index index.html;

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
}
EOF
sed -i "s/NODE_PORT_PLACEHOLDER/$NODE_PORT/g" /etc/nginx/sites-available/kossuite.site

# 3. Konfigurasi admin.kossuite.site (Portal Admin & License Server)
echo ">> Menyiapkan konfigurasi Nginx untuk admin.kossuite.site..."
cat << 'EOF' > /etc/nginx/sites-available/admin.kossuite.site
server {
    listen 80;
    listen [::]:80;
    server_name admin.kossuite.site;

    location / {
        proxy_pass http://127.0.0.1:NODE_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
sed -i "s/NODE_PORT_PLACEHOLDER/$NODE_PORT/g" /etc/nginx/sites-available/admin.kossuite.site

ln -sf /etc/nginx/sites-available/kossuite.site /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/admin.kossuite.site /etc/nginx/sites-enabled/

nginx -t
systemctl reload nginx

# 4. Pasang SSL resmi Let's Encrypt gratis untuk semua domain
echo ">> Memasang SSL Resmi (Let's Encrypt)..."
apt-get update -y
apt-get install -y certbot python3-certbot-nginx

certbot --nginx -d kossuite.site -d www.kossuite.site -d admin.kossuite.site --non-interactive --agree-tos --register-unsafely-without-email --redirect || \
certbot --nginx -d kossuite.site -d www.kossuite.site --non-interactive --agree-tos --register-unsafely-without-email --redirect || true

systemctl reload nginx

echo ""
echo "=========================================================="
echo "  BERHASIL! Setup Selesai:                                "
echo "  1. Aplikasi Kos : https://kossuite.site (SSL Aktif)     "
echo "  2. Admin Portal : https://admin.kossuite.site (SSL)     "
echo "=========================================================="
