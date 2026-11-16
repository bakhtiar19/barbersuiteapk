# Dokumentasi & Penjelasan Lengkap Aplikasi
**Barber Suite v4.2.0 — by Kriakarya 2026**

Dokumen ini menjelaskan secara menyeluruh dan mendalam mengenai arsitektur, alur kerja, fitur di setiap halaman, logika bisnis, skema database, hingga sistem keamanan pada aplikasi **Barber Suite v4.2.0**.

---

## 1. Gambaran Umum Aplikasi (Overview)

**Barber Suite v4.2.0** adalah sistem manajemen operasional dan kasir (*Point of Sale* / POS) yang dirancang khusus untuk kebutuhan **Barbershop** (mulai dari barbershop 1 kursi hingga multi-kursi).

### Identitas Aplikasi
- **Nama Aplikasi**: Barber Suite v4.2.0
- **Pengembang**: Kriakarya 2026
- **Application / Bundle ID**: `com.kriakarya.barbersuite`
- **Platform Dukungan**:
  - **Android Native (`.apk`)**: `Barber-Suite-v4.2.0.apk` (Signed Release) & `Barber-Suite-v4.2.0-debug.apk`
  - **iOS Native (Xcode Project)**: `ios/App/App.xcodeproj`
  - **Web / PWA (Progressive Web App)**: Berjalan di browser desktop, tablet, maupun smartphone.

### Tujuan & Filosofi Desain
1. **Kecepatan Kasir ($\le 30$ Detik per Transaksi)**: Kasir atau kapster dapat mencatat transaksi hanya dengan beberapa ketukan layar tanpa mengetik panjang.
2. **Mandiri & Stabil 100% di Perangkat Lokal**: Seluruh data disimpan di dalam database **SQLite lokal** pada perangkat pengguna. Aplikasi tidak bergantung pada koneksi internet untuk mencatat transaksi maupun membuka laporan.
3. **Tanpa BiayaPrinter Kertas (Struk Digital + Apresiasi WhatsApp)**: Menghasilkan gambar struk digital bergaya kertas thermal cetak yang bersih dan tajam (~30 KB), lalu mengirimkannya beserta teks ucapan apresiasi langsung ke nomor WhatsApp pelanggan.
4. **Akuntabilitas Keuangan & Komisi Kapster**: Memisahkan uang masuk berdasarkan metode bayar (Tunai, Transfer, QRIS), menghitung otomatis pendapatan per barber/kapster, serta mencegah kecurangan melalui fitur *Void* berjejak dan kunci PIN.
5. **Retensi Pelanggan (CRM Barbershop)**: Melacak kapan terakhir kali pelanggan potong rambut dan memfasilitasi *follow-up* WhatsApp 1-klik bagi pelanggan yang sudah lebih dari 3 minggu belum kembali.

---

## 2. Arsitektur & Teknologi (Tech Stack)

| Lapisan Sistem | Teknologi yang Digunakan | Fungsi & Peran |
| :--- | :--- | :--- |
| **Antarmuka (UI/UX)** | React 18 + TypeScript 5 + Tailwind CSS | Merender tampilan *Gentleman Minimalist* yang responsif di layar HP (navigasi bawah) maupun Tablet/Desktop (sidebar kiri & panel kasir 2 kolom). |
| **State Management** | Zustand (`settingsStore`, `cartStore`, `authStore`, `uiStore`) | Mengelola state keranjang kasir, sesi kunci PIN, pengaturan toko, dan notifikasi *toast* secara reaktif. |
| **Database Lokal** | SQLite (`@capacitor-community/sqlite` & `sql.js` WASM) | Menyimpan seluruh tabel relasional secara persisten di penyimpanan native Android/iOS maupun IndexedDB pada browser. |
| **Mobile Runtime** | Capacitor 6 (`@capacitor/core`, `filesystem`, `share`, `status-bar`, `splash-screen`) | Jembatan komunikasi antara kode TypeScript/React dengan fitur native sistem operasi Android dan iOS. |
| **Native WhatsApp Bridge** | Java `AndroidWhatsAppBridge` + `FileProvider` (`MainActivity.java`) | Mengirimkan file gambar struk (`EXTRA_STREAM`) dan teks apresiasi (`EXTRA_TEXT`) langsung ke nomor JID WhatsApp pelanggan (`<nomor>@s.whatsapp.net`). |
| **Generator Struk Digital** | HTML5 Canvas 2D Retina (`receiptImage.ts`) | Menggambar struk kertas thermal resolusi tinggi (2x Retina) dan mengompresinya menjadi file JPEG ringan (~25–35 KB). |
| **Generator Laporan** | `jsPDF` + `jspdf-autotable` & CSV Generator (`reportExport.ts`) | Membuat dokumen laporan keuangan resmi berformat `.pdf` dan file tabel `.csv` untuk Excel/Google Sheets. |
| **Keamanan & Kriptografi** | Web Crypto API + Pure-TS Fallback (`PBKDF2-SHA256` & `SHA-256`) | Mengamankan PIN aplikasi dengan *hashing* 100.000 iterasi serta memverifikasi keutuhan file Backup `.json`. |

---

## 3. Penjelasan Lengkap Setiap Halaman & Fitur

### 3.1. Halaman Persiapan Awal (Onboarding — `/onboarding`)
Saat aplikasi pertama kali diinstal dan dibuka, pengguna akan diarahkan ke halaman persiapan awal:
- **Langkah 1 — Identitas Barbershop**: Mengisi **Nama Barbershop** (wajib), **Alamat** (opsional), dan **Nomor Telepon/WhatsApp Toko** (opsional).
- **Langkah 2 — Daftar Barber Awal**: Menambahkan minimal 1 nama kapster/barber yang bertugas (bisa langsung menambah beberapa barber sekaligus).
- **Data Layanan Awal Otomatis (*Seed Data*)**: Sistem otomatis menyediakan 4 layanan standar barbershop agar kasir bisa langsung dipakai detik itu juga:
  1. *Haircut* — Rp 50.000 (30 menit)
  2. *Haircut + Wash* — Rp 65.000 (45 menit)
  3. *Shaving / Kumis & Jenggot* — Rp 25.000 (15 menit)
  4. *Creambath / Hair Spa* — Rp 60.000 (45 menit)

---

### 3.2. Layar Kunci Keamanan PIN (`PinLockModal`)
Jika fitur keamanan PIN diaktifkan di menu Pengaturan:
- Aplikasi akan meminta input **PIN 4–6 digit** setiap kali aplikasi baru dibuka.
- Dilengkapi mekanisme **Auto-Lock Inaktivitas**: Jika layar tidak disentuh atau aplikasi berpindah ke latar belakang (*background*) melebihi batas waktu yang ditentukan (1 menit, 5 menit, 15 menit, atau 30 menit), aplikasi otomatis terkunci kembali.
- PIN tidak pernah disimpan dalam bentuk teks biasa (*plaintext*), melainkan di-*hash* menggunakan algoritma **PBKDF2-SHA256 (100.000 iterasi)** dengan *salt* acak 16-byte.

---

### 3.3. Beranda / Dashboard (`/`)
Halaman utama untuk memantau kondisi operasional barbershop secara *real-time* pada hari berjalan:
1. **Header & Ringkasan Omzet Hari Ini**:
   - Menampilkan logo toko (atau inisial monogram), nama barbershop, dan tanggal hari ini dalam format Bahasa Indonesia.
   - Menampilkan **Omzet Hari Ini** (hanya menghitung transaksi berstatus `completed`, otomatis mengecualikan transaksi `void`).
   - Menampilkan **Jumlah Transaksi Hari Ini** dan **Rata-rata Nilai per Transaksi**.
2. **Tombol Aksi Cepat**:
   - **+ Transaksi Baru**: Membuka halaman Kasir (`/pos`).
   - **Lihat Laporan**: Membuka halaman Laporan Keuangan (`/reports`).
3. **Pengingat Backup Otomatis**:
   - Jika pemilik toko belum pernah melakukan backup atau backup terakhir sudah lebih dari **7 hari yang lalu**, muncul kartu pengingat di Beranda dengan tombol pintas menuju halaman Backup.
4. **Daftar 5 Transaksi Terakhir Hari Ini**:
   - Menampilkan daftar transaksi terbaru hari ini beserta jam transaksi, nama pelanggan, nama barber, metode pembayaran, dan nominal total. Jika diketuk, langsung membuka halaman **Detail Transaksi**.

---

### 3.4. Kasir Cepat / Fast POS (`/pos`)
Dirancang khusus untuk kecepatan tinggi di meja kasir, terutama ketika barbershop memiliki katalog layanan yang banyak:
1. **Pemilihan Barber Sekali Ketuk (*Barber Chips*)**:
   - Deretan tombol kapster aktif ditampilkan di bagian paling atas.
   - Sistem otomatis memilih kapster yang terakhir kali digunakan pada transaksi sebelumnya (*memory last barber*), sehingga jika hanya ada 1 kapster atau kapster yang sama, kasir tidak perlu memilih ulang.
2. **Pencarian & Pengurutan Katalog Layanan**:
   - **Kolom Cari Layanan**: Ketik sebagian nama layanan untuk memfilter secara instan. Menekan tombol `Enter` pada keyboard akan langsung menambahkan layanan urutan pertama ke keranjang dan mengosongkan kolom cari.
   - **3 Mode Urutan Katalog**:
     - **Terlaris**: Mengurutkan layanan berdasarkan frekuensi pemesanan terbanyak selama 90 hari terakhir. 3 layanan teratas diberi lencana khusus **Terlaris**.
     - **A–Z**: Mengurutkan nama layanan sesuai abjad.
     - **Harga**: Mengurutkan layanan dari harga termurah ke termahal.
3. **Kartu Layanan Interaktif (*Service Grid*)**:
   - Ketuk kartu layanan untuk langsung menambah kuantitas (`+1`, `+2`, dst.).
   - Layanan yang sudah dipilih akan menampilkan lencana jumlah pesanan dan tombol kurangi (`-`) langsung di sudut kartu.
4. **Panel Checkout & Pelanggan**:
   - Pada layar HP, bilah bawah (*Sticky Checkout Bar*) menampilkan total item dan total rupiah; ketuk **Lanjut Bayar** untuk membuka lembar checkout (*Bottom Sheet*). Pada layar Tablet/Desktop ($\ge 1024\text{px}$), panel checkout tampil permanen di sisi kanan.
   - **Input Pelanggan Pintar (`CustomerCombobox`)**:
     - Saat mengetik nama atau nomor HP, muncul saran pelanggan lama beserta nomor WhatsApp-nya.
     - Jika memilih pelanggan lama, status **"Pelanggan lama"** muncul dan nomor WhatsApp otomatis terisi.
     - Jika kasir hanya mengetik nama pelanggan lama (tanpa mengetuk daftar saran dan tanpa mengetik ulang nomor WA), sistem secara cerdas mencocokkan nama tersebut dengan pelanggan aktif di database yang sudah memiliki nomor WhatsApp.
     - Jika pelanggan benar-benar baru, data pelanggan tersebut otomatis dibuat dan disimpan saat transaksi disimpan.
   - **Metode Pembayaran**: Pilihan tombol **Tunai**, **Transfer**, atau **QRIS**.
   - **Diskon & Catatan (Opsional)**:
     - Mendukung diskon **Nominal (`Rp`)** maupun **Persen (`%`)**. Sistem memvalidasi agar diskon persen tidak melebihi $100\%$ dan diskon nominal tidak melebihi subtotal.
     - Kolom catatan untuk mencatat detail permintaan pelanggan pada transaksi tersebut.
5. **Penyimpanan Transaksi Atomik (`createTransactionAtomic`)**:
   - Seluruh proses pembuatan nomor struk harian (`TRX-YYYYMMDD-NNNN`), pembaruan data pelanggan, penyimpanan header transaksi, dan penyimpanan rincian item dijalankan di dalam **satu transaksi SQLite atomik** (`BEGIN IMMEDIATE ... COMMIT` / `ROLLBACK`).
   - Menyimpan *snapshot* nama layanan, harga satuan saat itu, dan nama barber pada tabel transaksi, sehingga perubahan harga layanan di masa depan tidak akan pernah merusak data transaksi masa lalu.

---

### 3.5. Halaman Transaksi Berhasil & Pengiriman Struk (`/pos/success/:id`)
Muncul tepat setelah transaksi disimpan di kasir:
1. **Ringkasan Pembayaran**: Menampilkan ikon sukses, nomor struk (`TRX-YYYYMMDD-NNNN`), total pembayaran besar, nama pelanggan, metode bayar, dan nama barber.
2. **Tombol Utama `Kirim Struk`**:
   - Berfungsi mengirimkan **gambar struk digital** sekaligus **teks apresiasi pelanggan** langsung ke nomor WhatsApp pelanggan yang bersangkutan.
   - Menampilkan informasi nomor tujuan di bawah tombol (`Tujuan WA: 0812...`) beserta tombol **Ubah Nomor / Isi Nomor**.
   - **Jika nomor WhatsApp pelanggan belum diisi saat di kasir**: Mengetuk tombol **`Kirim Struk`** akan memunculkan jendela input nomor WhatsApp pelanggan. Begitu nomor diisi dan dikonfirmasi, sistem menyimpan nomor tersebut ke database transaksi & pelanggan, lalu langsung mengirimkan gambar struk dan teks apresiasi ke nomor WhatsApp tersebut.
   - **Cara Kerja di Android (`Barber-Suite-v4.2.0.apk`)**:
     Melalui jembatan native `AndroidWhatsAppBridge`, aplikasi menyimpan gambar struk JPEG ke direktori cache, membuat URI aman via `androidx.core.content.FileProvider`, menyalin teks apresiasi sebagai cadangan ke clipboard, dan memanggil `Intent.ACTION_SEND` (`image/jpeg`) langsung ke paket WhatsApp (`com.whatsapp` atau WhatsApp Business `com.whatsapp.w4b`) dengan:
     - `EXTRA_STREAM`: File gambar struk (`struk-trx-....jpg`)
     - `EXTRA_TEXT`: Teks apresiasi pelanggan sebagai caption gambar
     - `"jid"`: `<nomor_pelanggan_62xxx>@s.whatsapp.net` (langsung mengarah ke ruang chat pelanggan tersebut).
3. **Pratinjau Gambar Struk Digital (`ReceiptPreview` & `receiptImage.ts`)**:
   - Merender struk bergaya cetakan kertas thermal putih bersih dengan tipografi *monospace*, memuat nama toko, alamat, nomor telepon toko, nomor struk, tanggal & jam, nama pelanggan, nama barber, daftar item layanan beserta kuantitas & harga, subtotal, diskon, total akhir, metode pembayaran, serta kalimat footer struk.
   - Tanpa dekorasi berlebihan dan tanpa mencantumkan nama/versi pembuat aplikasi di dalam struk pelanggan.
   - Resolusi tajam (2x Retina scale) namun dikompresi menjadi JPEG berkualitas tinggi dengan ukuran file sangat kecil (~25–35 KB).
4. **Kartu Teks Apresiasi Pelanggan**:
   - Menampilkan isi pesan apresiasi yang dikirim bersama gambar struk:
     ```text
     Terima kasih banyak sudah berkunjung ke *Nama Barbershop*, Nama Pelanggan! 🙏✂️

     Kami sangat menghargai kepercayaan Anda. Terlampir gambar struk layanan Anda:
     • No. Struk: TRX-20261111-0001
     • Tanggal: 11 Nov 2026, 10:30
     • Barber: Dimas
     • Total: *Rp 65.000* (Tunai)

     Terima kasih, sampai jumpa lagi! ✂️
     ```
5. **Tombol Aksi Pendukung**:
   - **Unduh**: Menyimpan file gambar struk `.jpg` ke penyimpanan perangkat.
   - **Bagikan**: Membuka menu *Share Sheet* sistem untuk membagikan gambar struk ke aplikasi lain.
   - **Detail**: Membuka halaman detail transaksi.
   - **Transaksi Baru** & **Beranda**: Kembali ke kasir kosong untuk antrean berikutnya atau kembali ke Beranda.

---

### 3.6. Riwayat & Detail Transaksi (`/transactions` & `/transactions/:id`)
1. **Daftar Riwayat Transaksi (`/transactions`)**:
   - Menampilkan seluruh transaksi dengan kolom pencarian (cari nomor struk `TRX-...` atau nama pelanggan).
   - **Filter Periode**: *Hari Ini, Minggu Ini, Bulan Ini, Semua, atau Kustom Tanggal*.
   - **Filter Status**: *Semua, Selesai (`completed`), atau Void (`void`)*.
   - Menampilkan ringkasan cepat jumlah transaksi dan total omzet dari daftar yang sedang difilter.
2. **Detail Transaksi (`/transactions/:id`)**:
   - Menampilkan pratinjau gambar struk digital, teks apresiasi pelanggan, tombol **`Kirim Struk`**, **Ubah/Isi Nomor WA**, **Unduh Gambar**, **Bagikan Gambar**, dan **Salin Teks**.
   - **Fitur Pembatalan Transaksi (*Void*)**:
     - Untuk transaksi berstatus `completed`, tersedia tombol **Batalkan Transaksi (Void)**.
     - Kasir/owner **wajib mengisi alasan pembatalan** (misalnya: *"Salah input layanan"*).
     - Setelah di-*Void*, status transaksi berubah menjadi `void`, waktu dan alasan pembatalan tercatat permanen, gambar struk menampilkan cap **DIBATALKAN (VOID)**, dan nominal transaksi langsung dikeluarkan dari perhitungan omzet Beranda, Laporan Keuangan, maupun total belanja pelanggan.

---

### 3.7. Manajemen Pelanggan / CRM (`/customers` & `/customers/:id`)
1. **Daftar Pelanggan (`/customers`)**:
   - Menampilkan kartu pelanggan beserta nomor WhatsApp, total kunjungan, total belanja (*total spent*), dan tanggal kunjungan terakhir.
   - **Pencarian & Urutan**: Cari nama/nomor HP; urutkan berdasarkan *Kunjungan Terakhir*, *Total Belanja Tertinggi*, atau *Nama A–Z*.
   - **Filter Retensi "Belum Kembali (>3 mgg)"**:
     Menyaring pelanggan yang kunjungan terakhirnya sudah lebih dari **21 hari (3 minggu)** yang lalu. Pada setiap kartu pelanggan yang memiliki nomor WhatsApp, tersedia tombol pintas **Follow-Up WA** untuk langsung mengirim pesan pengingat potong rambut.
   - Mendukung penambahan pelanggan baru secara manual (+ Pelanggan).
2. **Detail Pelanggan (`/customers/:id`)**:
   - Menampilkan profil pelanggan, **Total Kunjungan**, **Total Belanja**, **Kunjungan Terakhir**, serta **Layanan Favorit** (dihitung otomatis dari layanan yang paling sering diambil oleh pelanggan tersebut).
   - **Tombol Follow-Up WhatsApp**: Menyusun pesan otomatis dari template di Pengaturan dengan mengganti variabel `{nama}` (nama pelanggan), `{minggu}` (jumlah minggu sejak kunjungan terakhir), dan `{toko}` (nama barbershop).
   - **Catatan Pelanggan**: Menyimpan catatan preferensi gaya rambut atau kebiasaan pelanggan secara langsung.
   - **Riwayat Kunjungan**: Menampilkan seluruh daftar transaksi yang pernah dilakukan pelanggan tersebut.
   - **Ubah & Hapus/Arsipkan Pelanggan**: Jika pelanggan belum pernah bertransaksi, data dapat dihapus permanen; jika sudah memiliki riwayat transaksi, data diarsipkan (*soft-delete*) agar riwayat transaksi tetap utuh.

---

### 3.8. Laporan Keuangan & Performa (`/reports`)
Halaman analitik lengkap untuk pemilik barbershop:
1. **Filter Periode**:
   - Pilihan cepat **Hari Ini**, **Minggu Ini** (Senin–Minggu), **Bulan Ini**, atau **Kustom** (pilih tanggal `Dari` dan `Sampai`; sistem otomatis menormalisasi jika tanggal terbalik atau kosong).
2. **Kartu Ringkasan Utama**:
   - **Total Omzet**: Total pendapatan dari seluruh transaksi selesai (`status = 'completed'`) pada periode terpilih.
   - **Jumlah Transaksi**: Total transaksi selesai.
   - **Rata-rata / Transaksi**: Nilai rata-rata belanja per transaksi.
   - **Total Diskon**: Akumulasi diskon yang diberikan beserta informasi jumlah transaksi yang di-*Void* pada periode tersebut.
3. **Rincian Metode Pembayaran**:
   - Memisahkan nominal uang masuk ke dalam 3 kartu: **Tunai**, **Transfer**, dan **QRIS** (memudahkan pencocokan uang kas di laci dengan mutasi rekening/QRIS).
4. **Tabel Pendapatan per Barber**:
   - Menampilkan setiap kapster, jumlah pelanggan/transaksi yang ditangani, persentase kontribusi terhadap total omzet (dilengkapi indikator visual *progress bar*), dan total rupiah yang dihasilkan. Sangat berguna untuk menghitung komisi atau bagi hasil kapster.
5. **Tabel Pendapatan per Layanan**:
   - Menampilkan setiap jenis layanan, total kuantitas (*qty*) terjual, persentase kontribusi omzet, dan total rupiah per layanan.
6. **Ekspor Laporan Resmi (PDF & CSV)**:
   - **Tombol PDF**: Menghasilkan file dokumen `laporan-barber-suite-YYYY-MM-DD-YYYY-MM-DD.pdf` berisi kop nama toko, periode laporan, tabel ringkasan omzet, tabel pendapatan per barber, tabel pendapatan per layanan, dan rincian daftar transaksi.
   - **Tombol CSV**: Menghasilkan file `transaksi-YYYY-MM-DD-YYYY-MM-DD.csv` yang dapat dibuka langsung di Microsoft Excel atau Google Sheets.

---

### 3.9. Menu Lainnya (`/more`), Layanan (`/services`), & Barber (`/barbers`)
1. **Menu Lainnya (`/more`)**:
   - Pusat navigasi menuju Riwayat Transaksi, Katalog Layanan, Data Barber, Backup & Restore, serta Pengaturan, dilengkapi informasi identitas aplikasi **Barber Suite v4.2.0 by Kriakarya 2026**.
2. **Kelola Layanan (`/services`)**:
   - Menambah layanan baru (Nama Layanan, Harga dalam Rupiah, Estimasi Durasi dalam menit, dan status Aktif/Nonaktif).
   - Mengubah layanan yang sudah ada atau mengaktifkan/menonaktifkan layanan dari layar kasir.
   - Menghapus layanan (otomatis diarsipkan jika sudah pernah tercatat di transaksi, dan otomatis dipulihkan/diaktifkan kembali jika pengguna membuat layanan baru dengan nama yang sama persis).
3. **Kelola Barber (`/barbers`)**:
   - Menambah kapster baru (Nama Barber, Nomor WhatsApp/Telepon opsional, dan status Aktif/Nonaktif).
   - Mengubah data kapster atau menonaktifkan kapster yang sedang cuti/berhenti tanpa menghilangkan laporan komisi historisnya.

---

### 3.10. Backup & Restore Data (`/backup`)
Fitur perlindungan data agar pemilik barbershop dapat mencadangkan atau memindahkan data antarperangkat dengan aman:
1. **Informasi Status Data**: Menampilkan waktu backup terakhir serta jumlah total Transaksi, Pelanggan, Layanan, dan Barber yang tersimpan di perangkat saat ini.
2. **Ekspor Backup Sekarang (`.json`)**:
   - Mengambil seluruh data dari tabel `settings`, `barbers`, `services`, `customers`, `transactions`, `transaction_items`, dan `trx_counters`.
   - Menghitung nilai hash **SHA-256 Checksum** dari seluruh muatan data, lalu membungkusnya ke dalam file `bms-backup-YYYY-MM-DD.json`.
   - Pada perangkat Android/iOS, file disimpan dan dapat langsung dibagikan ke WhatsApp, Google Drive, atau penyimpanan internal.
3. **Restore dari File Backup (`.json`)**:
   - Memverifikasi struktur JSON (menggunakan *schema validation* Zod) dan mencocokkan ulang **SHA-256 Checksum**.
   - Jika file backup rusak, terpotong, atau telah dimodifikasi secara tidak sah sehingga *checksum* tidak cocok, sistem **menolak proses restore** sebelum menyentuh database, sehingga data yang ada di perangkat tetap 100% aman.
   - Jika valid, seluruh data dipulihkan di dalam satu transaksi database atomik dan seluruh tampilan aplikasi langsung disinkronkan.

---

### 3.11. Pengaturan Aplikasi (`/settings`)
1. **Profil & Struk Barbershop**:
   - **Logo Barbershop**: Unggah gambar logo toko (otomatis di-*crop* persegi dan dikompresi ke ukuran $256\times256$ piksel agar ringan, serta ikut tercetak di bagian atas struk digital).
   - **Nama Barbershop, Alamat, & Nomor Telepon/WA**: Ditampilkan pada Beranda, kop Struk Digital, dan kop Laporan PDF.
   - **Footer Struk**: Kalimat penutup di bagian bawah struk digital dan teks apresiasi WhatsApp (default: *"Terima kasih, sampai jumpa lagi! ✂️"*).
   - **Template Follow-Up WhatsApp**: Kalimat pengingat pelanggan yang mendukung variabel dinamis `{nama}`, `{minggu}`, dan `{toko}`.
2. **Keamanan PIN**:
   - Mengaktifkan PIN baru (4–6 digit angka + konfirmasi), mengubah PIN lama, menonaktifkan PIN, serta mengatur durasi **Auto-Lock** (1, 5, 15, atau 30 menit).

---

## 4. Skema Database SQLite Lokal

Database aplikasi bernama `barbershop_bms` dan dikelola melalui sistem migrasi otomatis (`src/db/migrations/001_initial.ts`):

1. **`settings`**: Menyimpan pasangan `key` dan `value` untuk konfigurasi toko, PIN (`pin_enabled`, `pin_hash`, `pin_salt`, `pin_auto_lock_minutes`), status `onboarding_completed`, dan `last_backup_at`.
2. **`barbers`**: Menyimpan data kapster (`id`, `name`, `phone`, `is_active`, `is_deleted`, `created_at`, `updated_at`).
3. **`services`**: Menyimpan katalog layanan (`id`, `name`, `price`, `duration_minutes`, `is_active`, `is_deleted`, `created_at`, `updated_at`).
4. **`customers`**: Menyimpan data pelanggan (`id`, `name`, `phone`, `notes`, `is_deleted`, `created_at`, `updated_at`) dengan indeks unik parsial pada nomor telepon pelanggan aktif.
5. **`transactions`**: Menyimpan transaksi utama (`id`, `trx_number`, `trx_date`, `created_at`, `customer_id`, `customer_name`, `customer_phone`, `barber_id`, `barber_name`, `subtotal`, `discount_type`, `discount_value`, `discount_amount`, `total`, `payment_method`, `notes`, `status`, `void_reason`, `voided_at`).
6. **`transaction_items`**: Menyimpan rincian layanan per transaksi (`id`, `transaction_id`, `service_id`, `service_name`, `unit_price`, `qty`, `line_total`) dengan relasi `ON DELETE CASCADE`.
7. **`trx_counters`**: Menyimpan nomor urut struk harian (`trx_date`, `last_seq`) agar penomoran `TRX-YYYYMMDD-NNNN` selalu berurutan dan tidak pernah ganda.

---

## 5. Struktur Direktori Proyek (Source Code Map)

```text
BMS/
├── Barber-Suite-v4.2.0.apk          # File APK Release Android (Signed, siap instal)
├── Barber-Suite-v4.2.0-debug.apk    # File APK Debug Android
├── howtoinstall.md                  # Panduan instalasi Android & iPhone (iOS)
├── materi.md                        # Materi produk, keunggulan & naskah konten UGC
├── penjelasan.md                    # Dokumentasi & penjelasan lengkap aplikasi (file ini)
├── android/                         # Proyek Native Android (Gradle + Capacitor)
│   └── app/src/main/
│       ├── AndroidManifest.xml      # Konfigurasi izin, FileProvider, dan queries WhatsApp
│       └── java/com/kriakarya/barbersuite/
│           └── MainActivity.java    # Activity utama + AndroidWhatsAppBridge (kirim gambar & teks ke WA)
├── ios/                             # Proyek Native iOS (Xcode)
│   └── App/App.xcodeproj            # File proyek Xcode untuk build ke iPhone/iPad
└── src/
    ├── main.tsx                     # Entry point aplikasi, inisialisasi SQLite & StatusBar/SplashScreen
    ├── App.tsx                      # Konfigurasi routing halaman, guard Onboarding, dan kunci PIN
    ├── components/
    │   ├── layout/                  # AppShell, BottomNav, PageHeader
    │   └── ui/                      # Button, Card, Input, Modal, BottomSheet, Badge, Toast, Skeleton
    ├── db/
    │   ├── client.ts                # Adapter SQLite (Native Capacitor SQLite & Web sql.js + IndexedDB)
    │   ├── migrate.ts               # Runner migrasi skema & seed layanan awal
    │   ├── migrations/              # Definisi tabel dan indeks SQLite
    │   └── repositories/            # Query & logika database (transaction, customer, service, barber, report, settings)
    ├── features/
    │   ├── auth/                    # Layar kunci PIN (PinLockModal)
    │   ├── backup/                  # Halaman & servis Backup/Restore JSON + verifikasi SHA-256
    │   ├── barbers/                 # Halaman manajemen kapster/barber
    │   ├── customers/               # Halaman daftar pelanggan, detail CRM, & follow-up WhatsApp
    │   ├── dashboard/               # Halaman Beranda harian
    │   ├── more/                    # Halaman menu Lainnya
    │   ├── onboarding/              # Halaman persiapan awal toko
    │   ├── pos/                     # Halaman Kasir Cepat, Checkout, Transaksi Berhasil, Riwayat & Detail Transaksi
    │   ├── receipt/                 # Generator gambar struk kertas thermal (receiptImage.ts) & servis pengiriman WA
    │   ├── reports/                 # Halaman laporan omzet, tabel performa, & ekspor PDF/CSV
    │   ├── services/                # Halaman manajemen katalog layanan
    │   └── settings/                # Halaman pengaturan toko & keamanan PIN
    ├── lib/                         # Utilitas format Rupiah, tanggal, nomor telepon, ID struk, & kriptografi
    ├── platform/                    # Abstraksi penyimpanan file, share sheet, & pembuka URL eksternal
    ├── stores/                      # Zustand state stores (authStore, cartStore, settingsStore, uiStore)
    └── tests/                       # Rangkaian pengujian otomatis Vitest (Unit, Repository, Backup, UI, & Full Audit)
```

