# Materi Produk, Fitur, Keunggulan & Naskah UGC
**Barber Suite v4.2.0 — by Kriakarya 2026**

Dokumen ini berisi materi lengkap pengenalan produk, daftar fitur, keunggulan kompetitif (*Unique Selling Points*), serta kumpulan naskah konten **UGC (User Generated Content)** siap pakai untuk promosi di TikTok, Instagram Reels, YouTube Shorts, dan WhatsApp.

---

## 1. Ringkasan Produk (Product Brief)

- **Nama Aplikasi**: Barber Suite v4.2.0
- **Pengembang**: Kriakarya 2026
- **Kategori**: Sistem Kasir (POS), CRM Pelanggan & Manajemen Operasional Barbershop
- **Platform**: Android (`.apk`), iOS (iPhone/iPad), dan Web/Tablet
- **Target Pengguna**:
  1. **Owner Barbershop** yang ingin memantau omzet harian, performa kapster, dan mencegah kebocoran kas tanpa harus selalu menjaga toko.
  2. **Kapster / Barber & Kasir** yang membutuhkan pencatatan transaksi super cepat tanpa ribet saat antrean ramai.
  3. **Barbershop Skala Rintisan hingga Multi-Kursi** yang ingin tampil profesional dengan struk digital WhatsApp tanpa biaya langganan bulanan.

---

## 2. Fitur Utama Barber Suite v4.2.0

### A. Kasir Cepat (Fast POS $\le 30$ Detik per Transaksi)
- **Tap-to-Add Katalog Layanan**: Ketuk kartu layanan untuk langsung menambah jumlah pesanan, lengkap dengan urutan otomatis berdasarkan layanan **Terlaris**, **A–Z**, atau **Harga**.
- **Pencarian Instan**: Cari dari puluhan layanan dalam hitungan milidetik (tekan `Enter` untuk langsung memasukkan ke keranjang).
- **Pilihan Barber Sekali Ketuk (*Barber Chips*)**: Pilih kapster yang bertugas di bagian atas layar kasir; aplikasi otomatis mengingat barber terakhir agar transaksi berikutnya lebih cepat.
- **Autocomplete Pelanggan Lama**: Ketik nama atau nomor HP pelanggan, sistem otomatis mengenali pelanggan lama dan mengisi nomor WhatsApp-nya.
- **Diskon & Multi-Metode Pembayaran**: Mendukung diskon nominal (`Rp`) maupun persentase (`%`), catatan model potongan rambut, serta pembayaran **Tunai**, **Transfer**, dan **QRIS**.

### B. Struk Digital Kertas Thermal HD & Apresiasi WhatsApp
- **Generator Gambar Struk Digital Ringan**: Setiap transaksi otomatis menghasilkan gambar struk bergaya cetakan kertas thermal yang bersih, tajam (HD), namun berukuran sangat ringan (~30 KB).
- **Tombol "Kirim Struk" Langsung ke WhatsApp Pelanggan**: Sekali ketuk, aplikasi langsung membuka chat WhatsApp nomor pelanggan yang bersangkutan dengan **lampiran gambar struk** beserta **teks ucapan terima kasih/apresiasi** toko Anda.
- **Opsi Unduh & Bagikan**: Gambar struk juga dapat disimpan ke galeri perangkat atau dibagikan ke aplikasi lain.

### C. Manajemen Pelanggan (CRM) & Pengingat Cukur Kembali
- **Riwayat Kunjungan Otomatis**: Setiap transaksi otomatis memperbarui jumlah kunjungan pelanggan, total belanja (*total spent*), tanggal kunjungan terakhir, serta **layanan favorit** pelanggan tersebut.
- **Catatan Preferensi Pelanggan**: Simpan catatan khusus tiap pelanggan (misalnya: *"Fade tipis samping, atas jangan terlalu pendek, pakai waterbased pomade"*).
- **Filter "Belum Kembali > 3 Minggu" & Follow-Up WA 1-Klik**: Menampilkan daftar pelanggan yang sudah lebih dari 3 minggu belum potong rambut. Cukup ketuk tombol **Follow-Up WA**, pesan sapaan personal otomatis terisi dan siap dikirim ke WhatsApp pelanggan.

### D. Laporan Omzet, Performa Barber & Ekspor PDF/CSV
- **Filter Periode Fleksibel**: Pantau laporan untuk **Hari Ini**, **Minggu Ini**, **Bulan Ini**, atau **Rentang Tanggal Kustom**.
- **Ringkasan Finansial Lengkap**: Menampilkan **Total Omzet**, jumlah transaksi selesai, rata-rata nilai transaksi, total diskon, jumlah transaksi dibatalkan (*void*), serta rincian nominal per metode bayar (**Tunai**, **Transfer**, **QRIS**).
- **Laporan Pendapatan per Barber**: Menghitung otomatis berapa pelanggan yang ditangani dan berapa total omzet yang dihasilkan oleh masing-masing kapster — sangat memudahkan perhitungan komisi/bagi hasil.
- **Laporan Pendapatan per Layanan**: Menunjukkan layanan mana yang paling banyak dipesan dan menyumbang omzet terbesar.
- **Ekspor PDF & CSV Resmi**: Cetak atau kirim laporan keuangan rapi berformat **PDF** ke pemilik barbershop, atau ekspor **CSV** untuk diolah di Excel/Google Sheets.

### E. Sistem Void Berjejak, Keamanan PIN & Backup Data
- **Pembatalan Transaksi (*Void*) dengan Audit Trail**: Transaksi yang salah input tidak dihapus begitu saja, melainkan dibatalkan (*Void*) dengan alasan wajib. Nominalnya otomatis dikecualikan dari laporan omzet, namun riwayatnya tetap tercatat agar kas tidak bisa dimanipulasi.
- **Kunci Keamanan PIN (4–6 Digit)**: Lindungi aplikasi dengan PIN terenkripsi (`PBKDF2-SHA256`) yang otomatis mengunci layar saat aplikasi ditinggalkan (*auto-lock*).
- **Backup & Restore `.json` Terverifikasi (`SHA-256`)**: Ekspor seluruh data toko ke satu file `.json` kapan saja untuk dicadangkan ke Google Drive/WhatsApp, lengkap dengan pengecekan integritas data saat *restore*.

---

## 3. Keunggulan Aplikasi (Unique Selling Points)

1. **Bebas Biaya Langganan Bulanan**
   Tidak perlu bayar sewa aplikasi ratusan ribu setiap bulan. Sekali pasang, seluruh fitur kasir, laporan PDF, hingga CRM pelanggan bisa dipakai selamanya.
2. **100% Stabil Tanpa Kuota / Internet**
   Seluruh database SQLite tersimpan langsung di dalam perangkat. Saat Wi-Fi barbershop mati atau sinyal lemah, kasir tetap berjalan 100% normal tanpa *loading*.
3. **Hemat Biaya Printer & Kertas Thermal**
   Tidak wajib beli printer Bluetooth atau isi ulang kertas struk terus-menerus. Struk digital berdesain kertas cetak langsung terkirim ke WhatsApp pelanggan lengkap dengan ucapan apresiasi.
4. **Mengubah Pelanggan Baru Jadi Pelanggan Tetap**
   Sebagian besar aplikasi kasir hanya mencatat uang masuk. **Barber Suite** membantu menaikkan omzet lewat fitur pengingat otomatis bagi pelanggan yang sudah $>3$ minggu belum cukur.
5. **Hitung Komisi Kapster Tanpa Pusing Rekap Buku**
   Tidak ada lagi salah hitung komisi barber di akhir minggu/bulan. Semua omzet per kapster dan per metode bayar (Tunai vs QRIS/Transfer) sudah terpisah otomatis.
6. **Dirancang Khusus untuk Barbershop (Gentleman Minimalist UI)**
   Tampilan bersih, maskulin, dan modern. Tidak dipenuhi menu stok gudang/minimarket yang rumit sehingga kapster baru bisa langsung menguasainya dalam 2 menit.

---

## 4. Naskah Konten UGC (TikTok / Instagram Reels / Shorts)

Berikut 5 skrip video vertikal (30–45 detik) bergaya *User Generated Content (UGC)* yang natural, persuasif, dan siap direkam.

---

### UGC Script 1: Sudut Pandang Owner Barbershop ("Masih Catat di Buku Tulis?")
- **Durasi**: ~35 detik
- **Target**: Pemilik barbershop yang masih pakai buku manual
- **Tone**: Jujur, *relatable*, solutif

| Waktu | Visual / Adegan | Voiceover / Dialog | Teks di Layar (On-Screen Text) |
| :--- | :--- | :--- | :--- |
| **00:00 – 00:04** | *(Hook)* Pegang buku catatan kasir yang penuh coretan di meja barbershop, wajah terlihat pusing. | "Jujur, dulu tiap malam tutup barbershop pasti pusing rekap buku tulis kayak gini. Belum lagi ngitung bagi hasil tiap kapster satu-satu." | **Masih rekap omzet barbershop pakai buku tulis? 😭✂️** |
| **00:04 – 00:12** | Tunjukkan layar HP membuka **Barber Suite v4.2.0**, tampak beranda gelap elegan dengan ringkasan omzet hari ini. | "Sekarang udah pindah pakai **Barber Suite**. Aplikasi kasir khusus barbershop yang tampilannya simpel banget." | **Barber Suite v4.2.0 — Kasir Khusus Barbershop** |
| **00:12 – 00:22** | Rekam layar saat pilih nama barber (1 klik), tap layanan *Haircut + Wash*, isi nama & nomor WA pelanggan, lalu klik *Simpan Transaksi*. | "Mau input transaksi? Tinggal pilih barbernya, tap layanan, masukin nama pelanggan, pilih bayar Tunai atau QRIS, beres nggak sampai 15 detik!" | **Input transaksi cuma 15 detik ⚡** |
| **00:22 – 00:29** | Tunjukkan halaman *Transaksi Berhasil*, klik tombol hijau **Kirim Struk**, lalu otomatis masuk ke WhatsApp pelanggan dengan gambar struk + teks ucapan terima kasih. | "Kerennya lagi, klik **Kirim Struk**, gambar struknya plus ucapan terima kasih langsung terkirim ke WhatsApp pelanggan. Nggak perlu beli kertas printer lagi!" | **Struk Digital + Apresiasi langsung masuk WA pelanggan 📲** |
| **00:29 – 00:35** | Buka menu **Laporan**, tunjukkan grafik/tabel *Pendapatan per Barber* dan klik **Export PDF**. | "Mau cek omzet dan komisi barber tinggal buka menu Laporan, bahkan bisa langsung di-export ke PDF. Yang punya barbershop wajib banget pakai ini!" | **Laporan Omzet & Komisi Barber Otomatis (Bisa Export PDF!)** |

---

### UGC Script 2: Fitur Struk WhatsApp & Apresiasi Pelanggan ("Bikin Barbershop Terlihat Kelas Atas")
- **Durasi**: ~30 detik
- **Target**: Barbershop yang ingin menaikkan citra *branding* di mata pelanggan
- **Tone**: Antusias, demonstratif

| Waktu | Visual / Adegan | Voiceover / Dialog | Teks di Layar (On-Screen Text) |
| :--- | :--- | :--- | :--- |
| **00:00 – 00:03** | *(Hook)* Pelanggan selesai potong rambut, bayar pakai QRIS di meja kasir. | "Cara simpel bikin pelanggan ngerasa barbershop kita profesional banget, padahal modal HP doang!" | **Rahasia bikin barbershop kelihatan mahal & profesional ✨** |
| **00:03 – 00:12** | Close-up tangan kasir di aplikasi **Barber Suite**: tap layanan, klik *Lanjut Bayar*, simpan transaksi. | "Setiap pelanggan selesai cukur dan bayar, kita input di **Barber Suite**." | **Catat di Barber Suite** |
| **00:12 – 00:22** | Tunjukkan pratinjau struk digital bergaya kertas cetak yang rapi, lalu ketuk tombol **Kirim Struk**. Layar berpindah ke WhatsApp pelanggan dengan gambar struk sudah terlampir. | "Begitu disimpan, struk digitalnya langsung jadi kayak struk kertas asli. Tinggal pencet **Kirim Struk**, gambar struk dan pesan apresiasi langsung masuk ke WA pelanggan!" | **Gambar Struk + Ucapan Terima Kasih langsung ke WA pelanggan!** |
| **00:22 – 00:30** | Pelanggan tersenyum melihat WA di HP-nya. | "Pelanggan senang karena dapat struk rapi dan disapa ramah, kita pun hemat nggak perlu beli kertas thermal. Cobain **Barber Suite** sekarang!" | **Hemat kertas printer, pelanggan makin respek! 🙏✂️** |

---

### UGC Script 3: Fitur Rahasia Penambah Omzet ("Cara Panggil Pelanggan Lama Balik Cukur Lagi")
- **Durasi**: ~35 detik
- **Target**: Pemilik barbershop yang ingin kursi cukurnya ramai terus di hari kerja
- **Tone**: Edukatif, *business hack*

| Waktu | Visual / Adegan | Voiceover / Dialog | Teks di Layar (On-Screen Text) |
| :--- | :--- | :--- | :--- |
| **00:00 – 00:04** | *(Hook)* Menunjuk ke arah kursi barbershop yang sedang kosong di siang hari. | "Kursi barbershop lagi sepi di hari biasa? Jangan cuma ditungguin, panggil pelanggan lama kamu pakai fitur ini!" | **Cara bikin pelanggan lama balik cukur lagi tanpa pasang iklan! 💡** |
| **00:04 – 00:14** | Buka menu **Pelanggan** di **Barber Suite**, lalu ketuk tab filter **Belum Kembali (>3 mgg)**. | "Di aplikasi **Barber Suite**, ada filter otomatis yang nampilin siapa aja pelanggan yang udah lebih dari 3 minggu belum potong rambut." | **Otomatis deteksi pelanggan yang >3 minggu belum cukur** |
| **00:14 – 00:25** | Buka detail salah satu pelanggan (terlihat layanan favorit & catatan potongannya), lalu klik tombol **Follow-Up WA**. | "Kita bahkan bisa lihat layanan favorit dan catatan model rambutnya. Tinggal klik **Follow-Up WA**, pesan pengingat ramah langsung kebuka di WhatsApp mereka!" | **1-Klik Follow-Up WhatsApp otomatis!** |
| **00:25 – 00:35** | Tunjukkan chat WA yang sudah terisi otomatis dengan nama pelanggan dan nama barbershop. | "Nggak perlu ngetik satu-satu. Dari 10 orang yang di-chat, lumayan banget kalau 3–4 orang langsung datang cukur hari ini. Wajib pakai **Barber Suite**!" | **Ubah pelanggan sekali datang jadi pelanggan langganan 💈** |

---

### UGC Script 4: Anti Bocor & Rekap Komisi Kapster 5 Detik
- **Durasi**: ~30 detik
- **Target**: Pemilik barbershop yang mempekerjakan kapster/karyawan
- **Tone**: Tegas, menenangkan bagi pemilik bisnis

| Waktu | Visual / Adegan | Voiceover / Dialog | Teks di Layar (On-Screen Text) |
| :--- | :--- | :--- | :--- |
| **00:00 – 00:04** | *(Hook)* Tampilan layar menu **Laporan** di **Barber Suite**. | "Punya kapster di barbershop tapi sering bingung bagi komisi dan takut uang kas selisih?" | **Punya karyawan di barbershop? Wajib tahu fitur ini! 👇** |
| **00:04 – 00:14** | Gulir halaman **Laporan** yang menampilkan *Total Omzet*, rincian *Tunai / Transfer / QRIS*, dan tabel *Pendapatan per Barber*. | "Di **Barber Suite**, uang masuk Tunai, Transfer, sama QRIS udah kepisah otomatis. Omzet tiap barber juga langsung kelihatan jelas: siapa pegang berapa kepala dan berapa rupiah." | **Tunai, QRIS, & Omzet per Barber terpisah otomatis!** |
| **00:14 – 00:22** | Tunjukkan fitur **Void Transaksi** yang mewajibkan alasan pembatalan, lalu tunjukkan layar **Kunci PIN**. | "Kalau ada transaksi batal, harus pakai fitur *Void* dan wajib isi alasan, jadi nggak bisa dihapus diam-diam. Plus aplikasinya bisa dikunci pakai PIN!" | **Ada sistem Void berjejak + Kunci PIN keamanan 🔒** |
| **00:22 – 00:30** | Klik tombol **PDF** di pojok kanan atas halaman Laporan, tampilkan hasil file PDF laporan yang rapi. | "Tiap malam tinggal klik tombol PDF, laporan keuangan siap dikirim ke owner. Praktis, transparan, dan 100% jalan lancar walau tanpa internet!" | **Export Laporan PDF 1-Klik · Jalan 100% Tanpa Internet** |

---

### UGC Script 5: Format Perbandingan ("Hari 1 Pakai Buku Manual vs Pakai Barber Suite")
- **Durasi**: ~25 detik
- **Target**: Audiens luas di Reels / TikTok
- **Tone**: Cepat, kontras *Before vs After*

| Waktu | Visual / Adegan | Voiceover / Dialog | Teks di Layar (On-Screen Text) |
| :--- | :--- | :--- | :--- |
| **00:00 – 00:05** | **Adegan Kiri/Awal**: Kasir sibuk mencari nama pelanggan di tumpukan buku, menghitung pakai kalkulator. | "Kasir barbershop zaman dulu: antrean udah panjang, masih sibuk nyari pulpen dan ngitung kembalian pakai kalkulator." | **❌ Cara Lama: Ribet, lambat, rawan selisih** |
| **00:05 – 00:15** | **Adegan Kanan/Sesudah**: Kasir santai mengetuk layar **Barber Suite v4.2.0**: pilih barber, tap layanan, simpan, klik **Kirim Struk**. | "Kasir barbershop pakai **Barber Suite**: tap barber, tap layanan, simpan, klik **Kirim Struk**—gambar struk dan ucapan terima kasih langsung mendarat di WA pelanggan!" | **✅ Pakai Barber Suite: Cepat, rapi, struk langsung ke WA!** |
| **00:15 – 00:25** | Tampilkan layar Beranda, Laporan PDF, dan Backup Data. | "Tanpa biaya bulanan, tanpa takut kuota habis, data aman bisa di-backup kapan aja. Upgrade barbershop kamu ke **Barber Suite v4.2.0** sekarang!" | **Barber Suite v4.2.0 by Kriakarya 2026 💈** |

---

## 5. Kumpulan Hook Video (3 Detik Pertama)

Gunakan kalimat pembuka berikut secara bergantian untuk menguji performa konten video Anda:

1. *"Punya barbershop tapi tiap malam masih pusing ngitung omzet dan komisi kapster di buku tulis?"*
2. *"Jangan beli printer kasir dulu sebelum kamu lihat fitur Kirim Struk WhatsApp di aplikasi barbershop ini!"*
3. *"Ini rahasia kenapa pelanggan barbershop kami selalu balik lagi tiap 3 minggu sekali..."*
4. *"Cuma modal 1 HP di meja kasir, barbershop kamu langsung kelihatan sekelas barbershop premium!"*
5. *"Aplikasi kasir barbershop tanpa biaya langganan bulanan dan tetap jalan 100% walau Wi-Fi mati!"*
6. *"Cara tahu layanan paling laris dan kapster paling rajin di barbershop kamu cuma dalam 5 detik."*
7. *"Sering selisih antara uang tunai di laci sama pembayaran QRIS di barbershop? Ini solusinya."*
8. *"Sekarang kirim gambar struk plus ucapan terima kasih ke nomor WA pelanggan cukup 1 kali klik!"*

---

## 6. Template Caption Media Sosial & Broadcast WhatsApp

### Caption Instagram / TikTok
> **Bikin operasional barbershop kamu naik kelas bareng Barber Suite v4.2.0! 💈✂️**
>
> Nggak perlu lagi rekap omzet di buku tulis atau pusing ngitung bagi hasil kapster tiap akhir bulan. Dengan **Barber Suite**, semuanya tercatat rapi dalam hitungan detik:
>
> ✅ **Kasir Cepat (Fast POS)** — Pilih barber & layanan cukup sekali tap
> ✅ **Struk Digital ke WhatsApp** — Kirim gambar struk + teks apresiasi langsung ke nomor WA pelanggan
> ✅ **CRM Pengingat Pelanggan** — Deteksi otomatis pelanggan yang $>3$ minggu belum cukur & follow-up WA 1-klik
> ✅ **Laporan Lengkap & Export PDF/CSV** — Omzet Tunai, Transfer, QRIS, hingga pendapatan per barber terhitung otomatis
> ✅ **100% Tanpa Langganan Bulanan & Jalan Tanpa Internet**
>
> Saatnya kelola barbershop lebih rapi, cepat, dan menguntungkan! 🚀
>
> `#barbersuite` `#aplikasibarbershop` `#kasirbarbershop` `#posbarbershop` `#bisnisbarbershop` `#barbershopindonesia` `#kriakarya`

---

### Pesan Penawaran / Broadcast WhatsApp untuk Owner Barbershop
> Halo Kak! 👋✂️
>
> Kenalin **Barber Suite v4.2.0 by Kriakarya**, aplikasi Kasir & Manajemen yang dirancang khusus untuk mempermudah operasional **Barbershop**.
>
> **Apa saja yang bikin Barber Suite beda?**
> 1️⃣ **Kasir Super Cepat**: Input transaksi layanan, diskon, dan metode bayar (Tunai/Transfer/QRIS) kurang dari 30 detik.
> 2️⃣ **Kirim Struk & Apresiasi ke WA**: Tanpa perlu beli kertas printer terus-menerus, gambar struk kertas digital + ucapan terima kasih langsung terkirim ke nomor WhatsApp pelanggan.
> 3️⃣ **Panggil Pelanggan Lama Balik Lagi**: Otomatis mendata pelanggan yang sudah $>3$ minggu belum potong rambut untuk di-*follow-up* via WhatsApp.
> 4️⃣ **Laporan Omzet & Komisi Barber Instan**: Rekap harian, mingguan, bulanan, pendapatan per barber, hingga **Export PDF & Excel (CSV)** sekali klik.
> 5️⃣ **Bebas Biaya Bulanan & Jalan Tanpa Internet**: Data aman di perangkat (dilengkapi kunci PIN & fitur Backup/Restore).
>
> Tersedia untuk **Android** dan **iPhone/iPad**. Yuk, rapiin pembukuan dan naikin omzet barbershop Kakak mulai hari ini! 💈🙏

