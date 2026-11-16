# PRD — Barbershop Management System (BMS)

| | |
|---|---|
| **Versi dokumen** | 1.0 |
| **Tanggal** | 10 November 2026 |
| **Status** | Draft siap implementasi |
| **Platform** | PWA (browser), Android (APK), iOS (Xcode) |
| **Tech stack** | React + Vite, TypeScript, Tailwind CSS, SQLite, Capacitor |

---

## 1. Ringkasan Produk

**BMS** adalah aplikasi kasir dan manajemen operasional untuk barbershop skala kecil–menengah (1 outlet, 1–10 barber). Aplikasi dirancang **mobile-first** dan **offline-first**: seluruh data (transaksi, pelanggan, layanan, barber) disimpan **lokal di perangkat dalam database SQLite**, tanpa backend/server.

Pemilik atau kasir dapat mencatat transaksi dalam hitungan detik, mengirim struk ke WhatsApp pelanggan, memantau omzet, dan membuat laporan keuangan. Karena data tersimpan di perangkat, **fitur Backup & Restore adalah fitur prioritas tertinggi**.

### 1.1 Catatan Interpretasi Persyaratan

Brief awal menyebut "online first" sekaligus "offline-first, tanpa backend". Dokumen ini menyelesaikan kontradiksi tersebut sebagai berikut:

| Aspek | Keputusan |
|---|---|
| Penyimpanan & operasional | **Offline-first penuh** (SQLite lokal). Semua fitur inti berjalan tanpa internet. |
| "Online" | Aplikasi tetap **dapat diakses dan diinstal lewat web (PWA)** dari URL hosting statis. Internet hanya dibutuhkan untuk: instal/update PWA pertama kali, membuka WhatsApp (share link), dan membagikan file backup ke cloud/pihak lain. |
| Backend | **Tidak ada.** Sinkronisasi multi-perangkat di luar scope v1 (lihat §14). |

### 1.2 Tujuan

1. Kasir dapat menyelesaikan satu transaksi dalam **< 30 detik**.
2. Struk terkirim ke WhatsApp pelanggan dengan **≤ 2 ketuk** setelah transaksi disimpan.
3. Pemilik melihat omzet, transaksi, dan layanan terlaris **langsung di layar pertama**.
4. **Nol kehilangan data**: backup mudah, restore teruji, pengingat berkala.
5. Satu basis kode untuk **web, Android, dan iOS**.

### 1.3 Non-Tujuan (v1)

- Sinkronisasi cloud / multi-device real-time.
- Multi-outlet, multi-user dengan role & login.
- Booking/antrean online pelanggan, stok produk, payroll/komisi, integrasi payment gateway.
- WhatsApp Business API (hanya WhatsApp Share Link `wa.me`).

---

## 2. Pengguna & Skenario

| Persona | Deskripsi | Kebutuhan utama |
|---|---|---|
| **Pemilik** (Owner) | Pemilik barbershop, mengelola semua data | Dashboard, laporan, backup, kelola layanan/barber |
| **Kasir** | Staf/barber yang mencatat transaksi di HP | Input transaksi cepat, kirim struk |

> v1 tanpa login: satu perangkat = satu instalasi. Opsional **PIN aplikasi** (4–6 digit) untuk mengunci akses (fitur ringan, lihat §6.9).

---

## 3. Tech Stack

| Lapisan | Teknologi | Alasan |
|---|---|---|
| UI | **React 18 + TypeScript** | Ekosistem matang, type-safe |
| Build tool | **Vite** | Cepat, mendukung PWA plugin |
| Styling | **Tailwind CSS** | Mobile-first utility, konsisten |
| Routing | **React Router v6** | Navigasi SPA |
| State | **Zustand** | Ringan; data persisten tetap di SQLite |
| Form & validasi | **React Hook Form + Zod** | Validasi skema type-safe |
| Database | **SQLite** via **`@capacitor-community/sqlite`** | Native SQLite di Android/iOS; di web memakai `jeep-sqlite` (sql.js/WASM + penyimpanan IndexedDB) → **satu API untuk semua platform** |
| Chart | **Recharts** | Grafik omzet |
| Tanggal | **date-fns** (locale `id`) | Format & rentang tanggal |
| PDF | **jsPDF + jspdf-autotable** | Export laporan PDF di sisi klien |
| CSV | Util internal (BOM UTF-8) | Kompatibel Excel |
| PWA | **vite-plugin-pwa** (Workbox) | Service worker, manifest, instal |
| Native | **Capacitor 6+** | Bungkus WebView → APK & iOS |
| Plugin Capacitor | `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/preferences`, `@capacitor/local-notifications`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/browser` | Simpan/bagikan file, pengingat, buka WhatsApp |
| Ikon | **lucide-react** | Konsisten, ringan |
| Test | **Vitest** + **React Testing Library** | Unit & komponen; repository diuji dengan sql.js in-memory |
| Lint/format | ESLint + Prettier | Kualitas kode |

---

## 4. Arsitektur

### 4.1 Gambaran Umum

```
┌──────────────────────────────────────────────────────────────┐
│                      PRESENTATION (React)                    │
│   Pages ─ Components ─ Hooks ─ Zustand stores (UI state)     │
└───────────────┬──────────────────────────────────────────────┘
                │ memanggil
┌───────────────▼──────────────────────────────────────────────┐
│                  DOMAIN / SERVICE LAYER                      │
│  transactionService · customerService · reportService        │
│  receiptService · backupService · whatsappService            │
│  (aturan bisnis, validasi Zod, orkestrasi transaksi DB)      │
└───────────────┬──────────────────────────────────────────────┘
                │ memanggil
┌───────────────▼──────────────────────────────────────────────┐
│                   DATA LAYER (Repository)                    │
│  serviceRepo · barberRepo · customerRepo · transactionRepo   │
│  settingsRepo · reportQueries                                │
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│               DATABASE ADAPTER (db/client.ts)                │
│     @capacitor-community/sqlite  (satu API, tiga platform)   │
│  ┌────────────┬──────────────────┬─────────────────────────┐ │
│  │ Android    │ iOS              │ Web / PWA               │ │
│  │ SQLite     │ SQLite           │ jeep-sqlite (WASM) +    │ │
│  │ native     │ native           │ IndexedDB store         │ │
│  └────────────┴──────────────────┴─────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

Platform services (abstraksi): Filesystem · Share · Notifications · Browser
   → implementasi native via Capacitor, fallback Web API di browser
```

### 4.2 Prinsip Arsitektur

1. **Layered & modular** — UI tidak pernah menulis SQL; hanya service → repository.
2. **Feature-based folder** — tiap fitur memiliki halaman, komponen, hook, dan service sendiri.
3. **Single source of truth = SQLite.** Zustand hanya untuk state UI sementara (draft keranjang kasir, filter).
4. **Platform abstraction** — fungsi spesifik platform (simpan file, share, buka URL) dibungkus di `src/platform/` dengan fallback web.
5. **Migrasi terversi** — skema berubah lewat file migrasi berurutan (`schema_version`).
6. **Snapshot harga** — item transaksi menyimpan nama & harga layanan saat transaksi (tidak berubah bila layanan diedit).
7. **Soft delete** — layanan, barber, dan pelanggan yang memiliki riwayat tidak dihapus fisik agar laporan tetap valid.
8. **Uang = integer Rupiah** (tanpa desimal) untuk menghindari galat floating point.
9. **Waktu** disimpan ISO-8601 UTC (`TEXT`), ditampilkan dalam zona waktu perangkat (WIB/WITA/WIT mengikuti perangkat).

### 4.3 Inisialisasi Aplikasi (Boot Sequence)

```
main.tsx
 ├─ [web saja] definisi custom element <jeep-sqlite>, initWebStore()
 ├─ db.init(): buat koneksi, jalankan migrasi, seed data awal (sekali)
 ├─ navigator.storage.persist() [web] — minta penyimpanan persisten
 ├─ load settings → Zustand
 └─ render <App/> → cek pengingat backup
```

### 4.4 Struktur Folder

```
barbershop-bms/
├─ PRD.md
├─ README.md                      # cara run, build APK, build iOS
├─ package.json
├─ vite.config.ts                 # + vite-plugin-pwa
├─ tsconfig.json
├─ tailwind.config.ts
├─ postcss.config.js
├─ capacitor.config.ts
├─ index.html
├─ public/
│  ├─ assets/sql-wasm.wasm        # untuk jeep-sqlite (web)
│  ├─ icons/                      # ikon PWA 192/512/maskable
│  └─ favicon.svg
├─ resources/                     # ikon & splash sumber (capacitor-assets)
├─ android/                       # dihasilkan: npx cap add android
├─ ios/                           # dihasilkan: npx cap add ios
├─ docs/
│  ├─ BUILD_ANDROID.md
│  ├─ BUILD_IOS.md
│  └─ BACKUP_RESTORE.md
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   ├─ routes.tsx
   ├─ styles/index.css            # @tailwind + design tokens
   ├─ db/
   │  ├─ client.ts                # koneksi, init, helper query/transaction
   │  ├─ migrations/
   │  │  ├─ index.ts              # daftar migrasi berurutan
   │  │  └─ 001_init.ts
   │  ├─ seed.ts                  # layanan contoh, pengaturan default
   │  └─ repositories/
   │     ├─ serviceRepo.ts
   │     ├─ barberRepo.ts
   │     ├─ customerRepo.ts
   │     ├─ transactionRepo.ts
   │     ├─ settingsRepo.ts
   │     └─ reportQueries.ts
   ├─ features/
   │  ├─ dashboard/
   │  ├─ pos/                     # transaksi / kasir
   │  ├─ customers/
   │  ├─ receipt/
   │  ├─ reports/
   │  ├─ services/
   │  ├─ barbers/
   │  ├─ backup/
   │  └─ settings/
   │     (tiap folder: pages/, components/, hooks/, service.ts, schema.ts)
   ├─ components/
   │  ├─ ui/                      # Button, Input, Select, Modal, BottomSheet, Toast, Badge, EmptyState, Skeleton
   │  └─ layout/                  # AppShell, BottomNav, PageHeader
   ├─ platform/
   │  ├─ files.ts                 # simpan/bagikan file (native + web fallback)
   │  ├─ share.ts
   │  ├─ browser.ts               # buka wa.me
   │  └─ notifications.ts
   ├─ lib/
   │  ├─ money.ts                 # formatRupiah, parse
   │  ├─ date.ts                  # rentang hari/minggu/bulan
   │  ├─ phone.ts                 # normalisasi nomor → 62xxxxxxxxxx
   │  ├─ id.ts                    # UUID, nomor transaksi
   │  ├─ csv.ts
   │  └─ pdf.ts
   ├─ stores/                     # Zustand: cartStore, settingsStore, uiStore
   ├─ types/                      # tipe domain (Service, Barber, Customer, Transaction…)
   └─ tests/
```

---

## 5. Desain / Frontend

### 5.1 Prinsip Desain

- **Mobile-first**: dirancang untuk lebar 360–430 px; tablet/desktop memakai layout lebih lebar (maks. konten 1024 px, navigasi berpindah ke sidebar ≥ 1024 px).
- **Satu tangan**: aksi utama di bagian bawah layar (ibu jari), tombol ≥ 44×44 px.
- **Cepat**: minim langkah, default cerdas (barber terakhir dipakai, metode tunai).
- **Jelas**: angka uang besar & kontras tinggi; bahasa Indonesia.
- **Aman area layar**: dukung `safe-area-inset` (notch iPhone) dan status bar Android.

### 5.2 Design Tokens (Tailwind)

| Token | Nilai | Pemakaian |
|---|---|---|
| `brand-900` | `#111827` | Header, teks utama |
| `brand-600` (primer) | `#B45309` (amber/tembaga) | Tombol utama, aksen — nuansa barbershop klasik |
| `brand-50` | `#FFFBEB` | Latar aksen lembut |
| `ink` | `#1F2937` | Teks |
| `muted` | `#6B7280` | Teks sekunder |
| `surface` | `#FFFFFF` / latar `#F9FAFB` | Kartu / halaman |
| `success` | `#16A34A` | Berhasil, aktif |
| `warning` | `#D97706` | Peringatan (backup) |
| `danger` | `#DC2626` | Hapus, error |
| Radius | `rounded-2xl` kartu, `rounded-xl` input | |
| Font | Inter / system-ui; angka `tabular-nums` | |
| Dark mode | Mengikuti sistem (`dark:` class), fase 2 bila perlu | |

### 5.3 Navigasi

**Bottom Navigation (5 tab)** pada mobile:

```
[ Beranda ] [ Pelanggan ] [  ＋ Kasir  ] [ Laporan ] [ Lainnya ]
                            (tombol tengah menonjol)
```

"Lainnya" berisi: Layanan, Barber, Backup & Restore, Pengaturan.

### 5.4 Peta Halaman & Rute

| Rute | Halaman |
|---|---|
| `/` | Dashboard |
| `/pos` | Kasir (form transaksi) |
| `/pos/success/:id` | Transaksi berhasil + kirim struk |
| `/transactions` | Daftar transaksi |
| `/transactions/:id` | Detail transaksi + struk |
| `/customers` | Daftar pelanggan |
| `/customers/:id` | Detail pelanggan (riwayat, favorit, catatan) |
| `/reports` | Laporan keuangan |
| `/services` | Manajemen layanan |
| `/barbers` | Manajemen barber |
| `/barbers/:id` | Detail barber |
| `/backup` | Backup & Restore |
| `/settings` | Pengaturan (profil toko, PIN, pengingat) |

### 5.5 Wireframe Layar Utama

**Dashboard**

```
┌─────────────────────────────┐
│ Halo, Barbershop Rapi   ⚙   │
│ ⚠ Backup terakhir 9 hari lalu│  ← banner bila lewat jadwal
│   [Backup sekarang]          │
├─────────────────────────────┤
│  OMZET HARI INI              │
│  Rp 1.250.000        ▲ 12%   │
├──────────────┬──────────────┤
│ Transaksi    │ Pelanggan    │
│     18       │     142      │
├──────────────┼──────────────┤
│ Rata-rata    │ Terlaris     │
│ Rp 69.444    │ Haircut      │
├─────────────────────────────┤
│ Omzet   [Harian|Bulanan]     │
│  ▂▃▅▇▅▆█  (grafik batang)    │
├─────────────────────────────┤
│ Transaksi Terakhir  Lihat ›  │
│ TRX-20261110-0018  Rp 50.000 │
│ Andi · Haircut · Tunai       │
│ …                            │
├─────────────────────────────┤
│ 🏠   👥   [＋]   📊   ☰      │
└─────────────────────────────┘
```

**Kasir**

```
┌─────────────────────────────┐
│ ← Transaksi Baru             │
│ No: TRX-20261110-0019        │
├─────────────────────────────┤
│ Nama pelanggan  [_________▾] │  ← autocomplete dari DB
│ WhatsApp        [08________] │
├─────────────────────────────┤
│ Barber    ( Dimas )( Reza )… │  ← chip horizontal
│ Layanan   [✓ Haircut 50rb ]  │  ← kartu pilih (multi)
│           [  Cuci   20rb ]   │
│           [  Pijat  30rb ]   │
├─────────────────────────────┤
│ Diskon [ Rp | % ] [______]   │
│ Pembayaran (Tunai|Transfer|QRIS)│
│ Catatan [__________________] │
├─────────────────────────────┤
│ Subtotal          Rp 70.000  │
│ Diskon            −Rp 5.000  │
│ TOTAL             Rp 65.000  │
│ [      SIMPAN TRANSAKSI    ] │  ← sticky bawah
└─────────────────────────────┘
```

**Transaksi berhasil**

```
┌─────────────────────────────┐
│        ✓ Berhasil!           │
│  TRX-20261110-0019           │
│  Rp 65.000 · Tunai           │
│                              │
│  [ Kirim Struk ke WhatsApp ] │
│  [ Lihat Struk ]             │
│  [ Transaksi Baru ]          │
└─────────────────────────────┘
```

### 5.6 Komponen UI Utama

`AppShell`, `BottomNav`, `StatCard`, `RevenueChart`, `TransactionListItem`, `CustomerCombobox` (cari + buat baru), `ServicePicker`, `BarberChips`, `PaymentMethodSelector`, `DiscountInput`, `ReceiptPreview`, `BottomSheet`, `ConfirmDialog`, `Toast`, `EmptyState`, `Skeleton`, `DateRangePicker`, `BackupStatusBanner`.

### 5.7 Status UI Wajib

Setiap halaman data memiliki **loading** (skeleton), **empty state** (ilustrasi + CTA), dan **error state** (pesan + coba lagi). Aksi destruktif memakai konfirmasi.

---

## 6. Fitur Inti & Kriteria Penerimaan

### 6.1 Dashboard

| Item | Definisi |
|---|---|
| Omzet hari ini | `SUM(total)` transaksi berstatus `completed` pada hari ini |
| Jumlah transaksi hari ini | `COUNT` transaksi `completed` hari ini |
| Jumlah pelanggan | Total pelanggan aktif (kartu juga menampilkan "baru hari ini") |
| Rata-rata nilai transaksi | Omzet hari ini ÷ jumlah transaksi hari ini (0 bila kosong) |
| Layanan paling populer | Layanan dengan jumlah item terbanyak (periode: bulan ini; fallback seluruh waktu) |
| Grafik omzet | Toggle **Harian** (30 hari terakhir) / **Bulanan** (12 bulan terakhir) |
| Transaksi terakhir | 5 transaksi terbaru, ketuk → detail |
| Banner backup | Tampil bila melewati interval pengingat |

**Kriteria penerimaan:** angka dashboard sama dengan total di Laporan untuk rentang yang sama; dashboard memuat < 1 detik pada 10.000 transaksi; pembatalan transaksi (void) langsung mengurangi omzet.

### 6.2 Transaksi / Kasir

- Input **nama pelanggan** (autocomplete dari DB; ketik nama baru otomatis membuat pelanggan).
- Input **nomor WhatsApp** (normalisasi otomatis ke format `62…`; boleh kosong untuk pelanggan walk-in tanpa nomor, tetapi struk WA tidak bisa dikirim).
- Pilih **layanan** (multi-pilih, hanya yang aktif), **harga otomatis** dari master layanan.
- Pilih **barber** (hanya yang aktif; wajib).
- **Diskon opsional**: nominal (Rp) atau persen (%), tidak boleh melebihi subtotal.
- **Metode pembayaran**: `cash` (Tunai), `transfer`, `qris`. Default: Tunai.
- **Catatan transaksi** (opsional).
- **Nomor transaksi otomatis**: format `TRX-YYYYMMDD-NNNN` (urutan harian, reset tiap hari, di-generate dalam transaksi database agar tidak ganda).
- **Simpan** dalam satu transaksi database atomik: (upsert pelanggan) + header transaksi + item transaksi.
- Setelah simpan → halaman sukses dengan tombol kirim struk WhatsApp.
- Koreksi: transaksi dapat **dibatalkan (void)** dengan alasan; tidak dihapus fisik.

**Kriteria penerimaan:** simpan gagal total bila salah satu langkah gagal (atomik); dua transaksi cepat berturut-turut tidak menghasilkan nomor sama; total = subtotal − diskon selalu ≥ 0.

### 6.3 Database Pelanggan (Wajib)

Daftar: pencarian (nama/nomor), urut (terakhir berkunjung, total belanja, nama).

Detail pelanggan:

- Nama, nomor WhatsApp (unik per nomor ternormalisasi).
- **Riwayat kunjungan** (daftar transaksi: tanggal, layanan, barber, total).
- **Total transaksi** (jumlah kunjungan) dan **total pengeluaran**.
- **Layanan favorit** (layanan paling sering dipakai).
- **Terakhir berkunjung**.
- **Catatan khusus** (mis. "suka fade tipis, alergi pomade X") — dapat diedit.
- **Tombol Follow-up WhatsApp**: membuka `wa.me` dengan template pesan yang dapat diedit (mis. "Halo {nama}, sudah {n} minggu sejak kunjungan terakhir. Yuk potong lagi di {toko}!").
- CRUD: tambah, edit, hapus (soft delete; riwayat transaksi tetap ada).
- Opsional: filter "Belum berkunjung > 30 hari" untuk daftar follow-up.

Statistik pelanggan dihitung dari tabel transaksi (bukan disimpan ganda) sehingga selalu konsisten.

### 6.4 Kirim Resi WhatsApp (Wajib)

Struk dibuat otomatis berupa **teks** (kompatibel semua perangkat) dan **pratinjau visual** di layar.

Isi struk:

```
*{NAMA BARBERSHOP}*
{Alamat}
{Telepon}
--------------------------------
No   : TRX-20261110-0019
Tgl  : 10 Nov 2026, 14:32
Plgn : Andi
Barber: Dimas
--------------------------------
Haircut            Rp 50.000
Cuci rambut        Rp 20.000
--------------------------------
Subtotal           Rp 70.000
Diskon             -Rp 5.000
*TOTAL             Rp 65.000*
Bayar: Tunai
--------------------------------
Terima kasih, sampai jumpa lagi! ✂️
```

Pengiriman:

- Tombol **"Kirim ke WhatsApp"** → membuka `https://wa.me/{nomor}?text={encodeURIComponent(struk)}` (tanpa WhatsApp Business API).
- Native: dibuka lewat `@capacitor/browser`/`App` agar memicu aplikasi WhatsApp; Web: `window.open`.
- Jika nomor kosong: tombol berubah menjadi "Bagikan struk" (Share sheet / `navigator.share`) atau salin teks.
- Footer struk dan info toko diambil dari Pengaturan.
- Struk dapat dibuka ulang dari detail transaksi kapan saja.

### 6.5 Laporan Keuangan (Wajib)

- Tab cepat: **Harian**, **Mingguan**, **Bulanan**, plus **Rentang tanggal kustom**.
- Ringkasan: **total omzet**, **total transaksi**, **rata-rata transaksi**, total diskon.
- **Pendapatan per layanan** (jumlah item & nominal).
- **Pendapatan per barber** (jumlah transaksi & nominal).
- **Per metode pembayaran** (Tunai/Transfer/QRIS: jumlah & nominal).
- Grafik tren omzet pada rentang terpilih.
- Daftar transaksi pada rentang (dapat diketuk).
- **Export CSV** dan **Export PDF** (header toko, periode, ringkasan, tabel rincian).
- Transaksi `void` dikecualikan dari omzet, ditampilkan terpisah bila difilter.
- Minggu dimulai hari **Senin** (konfigurasi di Pengaturan).

### 6.6 Manajemen Layanan (Wajib)

CRUD layanan: nama, harga (Rp), durasi menit (opsional), status aktif/nonaktif.
Seed awal: *Haircut, Haircut + Wash, Haircut + Massage, Hair Coloring*.
Aturan: layanan yang sudah dipakai transaksi **tidak dihapus fisik** (diarsipkan); layanan nonaktif tidak muncul di Kasir tapi tetap di laporan historis.

### 6.7 Manajemen Barber (Wajib)

CRUD barber: nama, nomor HP, status aktif/nonaktif.
Detail barber: **riwayat transaksi**, **total pelanggan unik yang ditangani**, **total pendapatan layanan**, filter periode.
Aturan hapus sama seperti layanan (soft delete).

### 6.8 Backup & Restore Data (Prioritas Tertinggi)

| Kemampuan | Rincian |
|---|---|
| **Backup ke file** | Ekspor seluruh database ke satu file `bms-backup-YYYYMMDD-HHmm.bms` (JSON terstruktur berisi `meta` {versi aplikasi, versi skema, tanggal, jumlah record, checksum SHA-256} + seluruh tabel). Disimpan ke folder dokumen perangkat dan/atau dibagikan lewat Share Sheet (Google Drive, WhatsApp, email, iCloud). Web: diunduh sebagai file. |
| **Restore database** | Pilih file `.bms` → validasi struktur, checksum, & versi skema → tampilkan ringkasan ("1.240 transaksi, 142 pelanggan, tanggal backup …") → konfirmasi eksplisit → **otomatis membuat snapshot "pre-restore"** → ganti data dalam satu transaksi atomik. Bila gagal → rollback, data lama utuh. Backup versi skema lama dimigrasikan otomatis. |
| **Export data transaksi** | CSV transaksi (header & rincian item) dengan filter tanggal, UTF-8 BOM agar terbuka benar di Excel. |
| **Pengingat backup berkala** | Pengaturan interval (Harian / 3 hari / Mingguan / 2 mingguan; default **mingguan**). Banner di Dashboard + notifikasi lokal (native) pada jadwal. Menyimpan `last_backup_at`. Peringatan merah bila > 2× interval. |
| **Backup otomatis lokal** | Snapshot internal otomatis (maks. 5 terakhir, rotasi) saat aplikasi dibuka bila melewati interval — sebagai jaring pengaman tambahan (bukan pengganti backup eksternal). |
| **Perlindungan data web** | Meminta `navigator.storage.persist()`; peringatan jelas bahwa menghapus data browser akan menghapus database tanpa backup. |

**Kriteria penerimaan:** backup lalu restore ke instalasi kosong menghasilkan data identik (jumlah & total uang sama); file korup/tidak valid ditolak dengan pesan jelas tanpa mengubah data; restore dapat dibatalkan sebelum konfirmasi.

### 6.9 Pengaturan

- Profil toko: nama, alamat, telepon, footer struk, logo (opsional).
- Template pesan follow-up WhatsApp.
- Interval pengingat backup.
- Hari awal minggu.
- **PIN aplikasi** (opsional, disimpan sebagai hash via Web Crypto/PBKDF2; terkunci otomatis setelah app ke background).
- Tentang aplikasi / versi.

---

## 7. Skema Database (SQLite)

Konvensi: `id` = `TEXT` UUID v4; uang = `INTEGER` (Rupiah); waktu = `TEXT` ISO-8601 UTC; boolean = `INTEGER` 0/1. `PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL` (native).

### 7.1 DDL (`001_init`)

```sql
CREATE TABLE schema_version (
  version     INTEGER PRIMARY KEY,
  applied_at  TEXT NOT NULL
);

CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
-- key: shop_name, shop_address, shop_phone, receipt_footer,
--      followup_template, backup_interval_days, last_backup_at,
--      week_start, pin_hash, pin_salt, currency

CREATE TABLE services (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  price            INTEGER NOT NULL CHECK (price >= 0),
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  is_active        INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  is_deleted       INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_services_name ON services (LOWER(name)) WHERE is_deleted = 0;

CREATE TABLE barbers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  is_deleted  INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE customers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT,                 -- ternormalisasi: 62xxxxxxxxxx
  notes       TEXT,
  is_deleted  INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_customers_phone ON customers (phone)
  WHERE phone IS NOT NULL AND is_deleted = 0;
CREATE INDEX ix_customers_name ON customers (name COLLATE NOCASE);

CREATE TABLE transactions (
  id               TEXT PRIMARY KEY,
  trx_number       TEXT NOT NULL UNIQUE,         -- TRX-YYYYMMDD-NNNN
  trx_date         TEXT NOT NULL,                -- 'YYYY-MM-DD' (tanggal lokal, untuk grup laporan)
  created_at       TEXT NOT NULL,                -- ISO UTC
  customer_id      TEXT REFERENCES customers(id),
  customer_name    TEXT NOT NULL,                -- snapshot
  customer_phone   TEXT,                         -- snapshot
  barber_id        TEXT NOT NULL REFERENCES barbers(id),
  barber_name      TEXT NOT NULL,                -- snapshot
  subtotal         INTEGER NOT NULL CHECK (subtotal >= 0),
  discount_type    TEXT CHECK (discount_type IN ('amount','percent')),
  discount_value   INTEGER NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  discount_amount  INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total            INTEGER NOT NULL CHECK (total >= 0),
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('cash','transfer','qris')),
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','void')),
  void_reason      TEXT,
  voided_at        TEXT
);
CREATE INDEX ix_trx_date      ON transactions (trx_date, status);
CREATE INDEX ix_trx_customer  ON transactions (customer_id, created_at);
CREATE INDEX ix_trx_barber    ON transactions (barber_id, trx_date);

CREATE TABLE transaction_items (
  id              TEXT PRIMARY KEY,
  transaction_id  TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  service_id      TEXT REFERENCES services(id),
  service_name    TEXT NOT NULL,                 -- snapshot
  unit_price      INTEGER NOT NULL CHECK (unit_price >= 0),   -- snapshot
  qty             INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  line_total      INTEGER NOT NULL CHECK (line_total >= 0)
);
CREATE INDEX ix_items_trx     ON transaction_items (transaction_id);
CREATE INDEX ix_items_service ON transaction_items (service_id);

CREATE TABLE trx_counters (          -- penomoran harian atomik
  trx_date  TEXT PRIMARY KEY,
  last_seq  INTEGER NOT NULL
);
```

### 7.2 Diagram Relasi

```
customers 1 ───< transactions >─── 1 barbers
                     │ 1
                     │
                     ▼ N
              transaction_items >─── 1 services
settings · trx_counters · schema_version  (tabel pendukung)
```

### 7.3 Query Kunci (referensi)

```sql
-- Omzet & jumlah transaksi hari ini
SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS trx_count
FROM transactions WHERE trx_date = :today AND status = 'completed';

-- Statistik pelanggan
SELECT c.id, c.name, c.phone,
       COUNT(t.id) AS visit_count,
       COALESCE(SUM(t.total),0) AS total_spent,
       MAX(t.created_at) AS last_visit
FROM customers c
LEFT JOIN transactions t ON t.customer_id = c.id AND t.status = 'completed'
WHERE c.is_deleted = 0
GROUP BY c.id;

-- Layanan favorit pelanggan
SELECT i.service_name, SUM(i.qty) AS cnt
FROM transaction_items i JOIN transactions t ON t.id = i.transaction_id
WHERE t.customer_id = :cid AND t.status = 'completed'
GROUP BY i.service_name ORDER BY cnt DESC LIMIT 1;

-- Pendapatan per layanan (rentang)
SELECT i.service_name, SUM(i.qty) AS qty, SUM(i.line_total) AS revenue
FROM transaction_items i JOIN transactions t ON t.id = i.transaction_id
WHERE t.trx_date BETWEEN :from AND :to AND t.status = 'completed'
GROUP BY i.service_name ORDER BY revenue DESC;

-- Pendapatan per barber & per metode pembayaran
SELECT barber_name, COUNT(*) AS trx, SUM(total) AS revenue
FROM transactions WHERE trx_date BETWEEN :from AND :to AND status='completed'
GROUP BY barber_id;

SELECT payment_method, COUNT(*) AS trx, SUM(total) AS revenue
FROM transactions WHERE trx_date BETWEEN :from AND :to AND status='completed'
GROUP BY payment_method;

-- Nomor transaksi atomik (di dalam transaksi DB)
INSERT INTO trx_counters (trx_date, last_seq) VALUES (:d, 1)
ON CONFLICT(trx_date) DO UPDATE SET last_seq = last_seq + 1
RETURNING last_seq;
```

> Catatan: diskon pada level transaksi; pendapatan per layanan memakai `line_total` (sebelum diskon). Laporan menampilkan baris "Diskon" terpisah agar total rekonsiliasi dengan omzet bersih.

### 7.4 Migrasi & Seed

- Daftar migrasi berurutan di `db/migrations/index.ts`; saat boot, jalankan semua versi > `MAX(schema_version.version)` dalam satu transaksi.
- Seed (sekali, saat DB kosong): 4 layanan contoh, pengaturan default (nama toko "Barbershop Saya", interval backup 7 hari, template follow-up, footer struk), tanpa barber/pelanggan (diarahkan lewat **onboarding singkat**: isi nama toko → tambah barber pertama).

---

## 8. Alur Pengguna (User Flow)

### 8.1 Onboarding (pertama kali)

```
Buka app → Isi profil toko (nama, alamat, telp) → Tambah barber pertama
→ (opsional) ubah harga layanan contoh → Dashboard
   ↳ Opsi: "Pulihkan dari backup" bila pindah perangkat
```

### 8.2 Membuat Transaksi

```
Dashboard / tab Kasir
 → Isi nama (pilih dari saran atau ketik baru) → nomor WA terisi otomatis bila pelanggan lama
 → Pilih barber → Pilih layanan (harga otomatis, subtotal terhitung)
 → (opsional) diskon, metode bayar, catatan
 → Simpan Transaksi  ──(validasi gagal)──> pesan error di field
 → Halaman Sukses ─┬─ Kirim Struk ke WhatsApp → wa.me terbuka dengan teks struk
                   ├─ Lihat Struk
                   └─ Transaksi Baru
```

### 8.3 Follow-up Pelanggan

```
Tab Pelanggan → cari / filter "Lama tidak berkunjung" → buka detail
→ Lihat riwayat, favorit, catatan → Tombol "Follow-up WhatsApp"
→ Edit template pesan (opsional) → wa.me terbuka
```

### 8.4 Laporan & Export

```
Tab Laporan → pilih Harian/Mingguan/Bulanan atau rentang tanggal
→ Lihat ringkasan, per layanan, per barber, per metode bayar
→ Export → pilih PDF / CSV → file tersimpan / dibagikan (Share Sheet)
```

### 8.5 Backup

```
Lainnya → Backup & Restore → "Backup Sekarang"
→ File .bms dibuat → pilih tujuan (simpan ke perangkat / Share: Drive, WA, email)
→ last_backup_at diperbarui → banner pengingat hilang
```

### 8.6 Restore

```
Backup & Restore → "Pulihkan Data" → pilih file .bms
→ Validasi (struktur, checksum, versi) ─gagal→ pesan error, data aman
→ Ringkasan isi backup + peringatan "data saat ini akan diganti"
→ Konfirmasi (ketik "PULIHKAN") → snapshot pre-restore otomatis
→ Restore atomik → app dimuat ulang → Dashboard
```

### 8.7 Void Transaksi

```
Detail transaksi → "Batalkan Transaksi" → isi alasan → konfirmasi
→ status = void (dikeluarkan dari omzet, tetap tercatat & terlihat di riwayat)
```

---

## 9. Persyaratan Platform

### 9.1 PWA

- `vite-plugin-pwa` dengan `registerType: 'autoUpdate'`, precache seluruh aset (termasuk `sql-wasm.wasm`) → **berjalan penuh offline setelah kunjungan pertama**.
- Manifest: `name`, `short_name`, `display: standalone`, `theme_color`, ikon 192/512 + maskable, `start_url: "/"`, `orientation: portrait`.
- Prompt instal ("Tambahkan ke layar utama"), panduan khusus iOS Safari (Share → Add to Home Screen).
- Hosting statis HTTPS (Netlify/Vercel/Cloudflare Pages/GitHub Pages) — **tidak ada server aplikasi**.

### 9.2 Capacitor

`capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.barbershop.bms',
  appName: 'Barbershop BMS',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      androidIsEncryption: false
    },
    SplashScreen: { launchShowDuration: 800, backgroundColor: '#111827' },
    LocalNotifications: { smallIcon: 'ic_stat_icon', iconColor: '#B45309' }
  }
};
export default config;
```

Konfigurasi platform:

- **Android:** `minSdkVersion 23`, izin minimum (tanpa izin storage luas; file lewat `Filesystem` direktori `Documents`/`Cache` + Share), `POST_NOTIFICATIONS` untuk Android 13+, `allowBackup` dikelola, ikon adaptif, tanda tangan keystore untuk rilis.
- **iOS:** deployment target 14+, `Info.plist` (`UIFileSharingEnabled` & `LSSupportsOpeningDocumentsInPlace` agar file backup terlihat di app Files, `LSApplicationQueriesSchemes` berisi `whatsapp`), ikon & launch screen, signing di Xcode.
- Web store SQLite: `jeep-sqlite` + `sql-wasm.wasm` disalin ke `public/assets/` (script `postinstall`/`copy-wasm`).

### 9.3 Kompatibilitas Browser & WebView

Target: Chrome/Edge ≥ 100, Safari ≥ 15 (iOS), Firefox ≥ 100, Android WebView ≥ 100, WKWebView iOS ≥ 14. Hindari API non-universal tanpa fallback (mis. `navigator.share` → fallback salin/unduh; `File System Access API` tidak dipakai).

---

## 10. Persyaratan Non-Fungsional

| Area | Target |
|---|---|
| **Kinerja** | Cold start < 2 dtk di HP menengah; simpan transaksi < 300 ms; daftar virtualisasi/paginasi 50 baris; query laporan < 500 ms pada 50.000 transaksi (indeks sesuai §7) |
| **Offline** | 100% fitur inti tanpa internet (kecuali membuka WhatsApp) |
| **Integritas data** | Foreign key aktif, operasi tulis ganda dalam transaksi DB, CHECK constraint, snapshot harga |
| **Keamanan** | Data hanya di perangkat; PIN opsional (hash+salt); tidak ada telemetri/pelacakan; file backup tidak terenkripsi pada v1 (peringatan ditampilkan) — enkripsi kata sandi backup masuk roadmap |
| **Privasi** | Nomor WhatsApp pelanggan tidak keluar dari perangkat kecuali saat pengguna menekan tombol kirim |
| **Aksesibilitas** | Kontras WCAG AA, target sentuh ≥ 44 px, label form jelas, fokus terlihat |
| **Lokalisasi** | Bahasa Indonesia; format `Rp 1.250.000`; tanggal `10 Nov 2026`; struktur i18n siap bila perlu bahasa lain |
| **Kualitas** | TypeScript strict; cakupan unit test ≥ 70% pada service & repository; tanpa `any` implisit |
| **Ukuran** | Bundel awal (gzip) target < 400 KB di luar WASM |

---

## 11. Strategi Pengujian

- **Unit:** `money`, `phone`, `date`, penomoran transaksi, perhitungan diskon, template struk.
- **Integrasi (repository):** jalankan migrasi & query terhadap sql.js in-memory — CRUD, laporan, statistik pelanggan, void.
- **Backup/restore:** uji round-trip, file korup, versi skema lama, rollback saat gagal.
- **Komponen/UI:** alur Kasir end-to-end (RTL).
- **Manual perangkat:** Android (fisik/emulator), iPhone (simulator/fisik), Chrome & Safari PWA (instal, mode offline, restart).

---

## 12. Dokumentasi yang Disertakan

`README.md` berisi: prasyarat (Node 20+, JDK 17, Android Studio, Xcode + CocoaPods), instal & jalankan dev (`npm i`, `npm run dev`), build PWA (`npm run build`, `npm run preview`), deploy hosting statis, **build APK** dan **build iOS** (ringkasan di bawah), troubleshooting umum, dan panduan backup/restore untuk pengguna akhir.

### 12.1 Ringkasan Perintah

```bash
# Setup
npm install
npm run dev                         # dev server (browser)

# Build web + sinkron ke native
npm run build
npx cap add android                 # sekali
npx cap add ios                     # sekali (butuh macOS)
npx cap sync                        # setelah setiap perubahan web

# Android → APK
npx cap open android                # Android Studio
#  Build > Build Bundle(s)/APK(s) > Build APK(s)    (debug)
#  Build > Generate Signed Bundle / APK              (release, keystore)
# atau CLI:
cd android && ./gradlew assembleDebug               # output: app/build/outputs/apk/debug/
cd android && ./gradlew assembleRelease             # perlu signingConfig

# iOS → Xcode (macOS)
npx cap open ios
#  Pilih Team (Signing & Capabilities) → pilih device/simulator → Run
#  Product > Archive → Distribute (TestFlight/App Store/Ad Hoc)
```

> Build iOS hanya bisa dilakukan di macOS dengan Xcode dan akun Apple Developer (akun gratis cukup untuk uji di perangkat sendiri).

---

## 13. Rencana Implementasi (Milestone)

| # | Milestone | Isi | Hasil |
|---|---|---|---|
| **M0** | Fondasi | Scaffold Vite+React+TS+Tailwind, Capacitor, PWA, struktur folder, adapter SQLite + migrasi + seed, AppShell & navigasi, komponen UI dasar | App kosong berjalan di web, Android, iOS dengan DB hidup |
| **M1** | Master data | CRUD Layanan & Barber, Pengaturan toko, onboarding | Data master berfungsi |
| **M2** | Kasir & Struk | Form transaksi, penomoran atomik, simpan atomik, halaman sukses, struk + kirim WhatsApp, daftar/detail/void transaksi | Alur utama end-to-end |
| **M3** | Pelanggan | Daftar, detail, statistik, favorit, catatan, follow-up WhatsApp | Database pelanggan lengkap |
| **M4** | Dashboard & Laporan | Kartu statistik, grafik, laporan harian/mingguan/bulanan/kustom, export CSV & PDF | Insight bisnis |
| **M5** | Backup & Restore | Backup/restore file, snapshot otomatis, pengingat, export transaksi, validasi & rollback | Data aman (**gate rilis**) |
| **M6** | Finalisasi | PIN opsional, polishing UI/aksesibilitas, tes menyeluruh, dokumentasi build APK/iOS, ikon & splash | Rilis v1.0 |

> **Aturan prioritas:** M5 tidak boleh dilewati; rilis v1.0 diblokir bila uji round-trip backup/restore belum lulus.

---

## 14. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Data hilang (HP rusak/hilang, data browser terhapus) | Sangat tinggi | Backup prioritas, pengingat, snapshot otomatis, `storage.persist()`, panduan pengguna |
| Penyimpanan IndexedDB web dibersihkan browser (terutama Safari iOS) | Tinggi | Sarankan instal PWA/APK/iOS native; peringatan; pengingat backup; persist storage |
| Perbedaan perilaku SQLite web vs native | Sedang | Satu plugin untuk semua platform; uji repository di sql.js; uji perangkat nyata |
| WhatsApp tidak terpasang / nomor salah | Rendah | Fallback Share/salin teks; validasi & normalisasi nomor |
| Nomor transaksi ganda | Sedang | Counter harian dalam transaksi DB + UNIQUE constraint |
| Perubahan skema merusak data lama | Tinggi | Migrasi terversi, snapshot sebelum migrasi, uji restore lintas versi |
| Aplikasi iOS butuh akun developer & macOS | Sedang | Dokumentasikan jelas; PWA sebagai alternatif iOS |

---

## 15. Roadmap Pasca-v1 (Di Luar Scope)

1. Backup terenkripsi (kata sandi) & backup otomatis ke cloud opsional (Google Drive/iCloud).
2. Sinkronisasi multi-perangkat (backend opsional).
3. Multi-user & role (Owner/Kasir), login.
4. Komisi/bagi hasil barber, absensi.
5. Booking/antrean, pengingat jadwal.
6. Stok produk & penjualan produk (pomade, dll.), pengeluaran/biaya operasional (laba-rugi).
7. Program loyalitas (poin/stamp), voucher.
8. Cetak struk thermal Bluetooth (ESC/POS).
9. Dark mode & multi-bahasa.

---

## 16. Definisi Selesai (Definition of Done) v1.0

- [ ] Seluruh fitur §6 berfungsi dengan **CRUD & database SQLite nyata** (bukan mockup).
- [ ] Berjalan penuh offline sebagai PWA; dapat diinstal di Android & iOS (Add to Home Screen).
- [ ] `npx cap sync` + build **APK** Android berhasil dan teruji di perangkat.
- [ ] Proyek iOS dapat dibuka & dijalankan di Xcode (simulator/perangkat).
- [ ] Uji round-trip **backup → restore** lulus; file korup ditolak aman.
- [ ] Angka Dashboard = angka Laporan untuk rentang yang sama.
- [ ] Struk WhatsApp terkirim via `wa.me` pada Android, iOS, dan web.
- [ ] Export PDF & CSV menghasilkan file valid.
- [ ] README & dokumentasi build tersedia dan teruji ulang oleh orang lain.