# Barbershop BMS (Barbershop Management System)

Aplikasi kasir dan manajemen operasional barbershop **mobile-first** dan **offline-first** berbasis SQLite lokal untuk Web/PWA, Android, dan iOS.

## Fitur Utama

- **Kasir Cepat (< 30 detik)**: Autocomplete pelanggan, pilih barber & multi-layanan, diskon nominal/persen, Tunai/Transfer/QRIS, penomoran harian atomik `TRX-YYYYMMDD-NNNN`.
- **Struk WhatsApp**: Pratinjau struk visual & kirim langsung via `wa.me` dalam ≤ 2 ketuk (atau Bagikan/Salin untuk walk-in tanpa nomor).
- **Dashboard & Laporan Keuangan**: Omzet hari ini, grafik harian (30 hari) & bulanan (12 bulan), laporan Harian/Mingguan/Bulanan/Kustom, rincian per layanan/barber/metode bayar, serta ekspor **PDF** dan **CSV (UTF-8 BOM)**.
- **Database Pelanggan**: Riwayat kunjungan, total belanja, layanan favorit, catatan khusus, filter pelanggan > 30 hari tidak berkunjung, dan tombol Follow-up WhatsApp.
- **Backup & Restore (Prioritas Tertinggi)**: Ekspor file `.bms` dengan checksum SHA-256, validasi sebelum restore, snapshot otomatis *pre-restore* dan rollback atomik bila gagal.
- **Keamanan Opsional**: Kunci PIN 4–6 digit (PBKDF2 + salt).

## Prasyarat

- Node.js 20+ & npm
- Untuk Android APK: JDK 17 + Android Studio (SDK 34+)
- Untuk iOS: macOS + Xcode 15+ + CocoaPods

## Menjalankan di Browser (Development)

```bash
npm install
npm run dev
```

Buka URL lokal yang tampil (umumnya `http://localhost:5173`).

## Pengujian & Typecheck

```bash
npm run typecheck
npm test
```

## Build PWA & Sinkronisasi Native

```bash
npm run build
npx cap add android   # sekali di awal
npx cap add ios       # sekali di awal (macOS)
npx cap sync
```

Lihat panduan rinci:
- [Panduan Build Android (APK)](./docs/BUILD_ANDROID.md)
- [Panduan Build iOS (Xcode)](./docs/BUILD_IOS.md)
- [Panduan Backup & Restore Pengguna](./docs/BACKUP_RESTORE.md)

