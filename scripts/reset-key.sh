#!/bin/bash
set -e

echo "Mengunduh skrip reset kunci admin..."
curl -sSL -o /tmp/reset-admin.js https://raw.githubusercontent.com/bakhtiar19/barbersuiteapk/main/scripts/reset-admin.js
node /tmp/reset-admin.js
rm -f /tmp/reset-admin.js
