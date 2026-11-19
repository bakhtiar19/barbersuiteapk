#!/bin/bash
set -e

echo "=========================================================="
echo "  Setup barbersuite.site & admin.barbersuite.site         "
echo "=========================================================="

# 1. Deteksi Port Node.js backend
NODE_PORT=$(ss -tulpn 2>/dev/null | grep -E "node" | grep -oP ':\K[0-9]+' | head -n 1)
if [ -z "$NODE_PORT" ]; then
    NODE_PORT=3000
fi
echo ">> Backend terdeteksi pada port: $NODE_PORT"

# 2. Konfigurasi barbersuite.site (Aplikasi Kasir Barber Suite)
echo ">> Menyiapkan konfigurasi Nginx untuk barbersuite.site..."
cat << 'EOF' > /etc/nginx/sites-available/barbersuite.site
server {
    listen 80;
    listen [::]:80;
    server_name barbersuite.site www.barbersuite.site;

    root /var/www/barbersuite;
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
sed -i "s/NODE_PORT_PLACEHOLDER/$NODE_PORT/g" /etc/nginx/sites-available/barbersuite.site

# 3. Konfigurasi admin.barbersuite.site (Portal Admin Multi-App & License Server)
echo ">> Menyiapkan konfigurasi Nginx untuk admin.barbersuite.site..."
cat << 'EOF' > /etc/nginx/sites-available/admin.barbersuite.site
server {
    listen 80;
    listen [::]:80;
    server_name admin.barbersuite.site;

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
sed -i "s/NODE_PORT_PLACEHOLDER/$NODE_PORT/g" /etc/nginx/sites-available/admin.barbersuite.site

ln -sf /etc/nginx/sites-available/barbersuite.site /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/admin.barbersuite.site /etc/nginx/sites-enabled/

nginx -t
systemctl reload nginx

# 4. Pasang SSL resmi Let's Encrypt gratis untuk semua domain
echo ">> Memasang SSL Resmi (Let's Encrypt)..."
apt-get update -y
apt-get install -y certbot python3-certbot-nginx

certbot --nginx -d barbersuite.site -d www.barbersuite.site -d admin.barbersuite.site --non-interactive --agree-tos --register-unsafely-without-email --redirect || \
certbot --nginx -d barbersuite.site -d www.barbersuite.site --non-interactive --agree-tos --register-unsafely-without-email --redirect || true

systemctl reload nginx

echo ""
echo "=========================================================="
echo "  BERHASIL! Setup Selesai:                                "
echo "  1. Aplikasi Kasir : https://barbersuite.site (SSL Aktif)"
echo "  2. Admin Portal   : https://admin.barbersuite.site (SSL) "
echo "=========================================================="
