# Panduan Backup & Restore Data

Semua data Barbershop BMS disimpan lokal di perangkat dalam database SQLite.

## Membuat Backup
1. Buka menu **Lainnya → Backup & Restore**.
2. Ketuk **Unduh File Backup (.bms)** atau **Bagikan (Drive / WA / Email)**.
3. Simpan file `bms-backup-YYYYMMDD-HHmm.bms` di tempat aman (Google Drive, WhatsApp pribadi, atau komputer).

## Memulihkan Data (Restore)
1. Buka **Lainnya → Backup & Restore** (atau pilih **Pulihkan dari Backup** pada layar awal).
2. Pilih file `.bms`. Aplikasi otomatis memeriksa struktur dan checksum SHA-256.
3. Periksa ringkasan data, ketik `PULIHKAN`, lalu konfirmasi.
4. Aplikasi menyimpan snapshot internal *pre-restore* sebelum menimpa data secara atomik.

