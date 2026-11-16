# Panduan Instalasi Barber Suite v4.2.0
**by Kriakarya 2026**

Dokumen ini berisi panduan lengkap langkah demi langkah untuk menginstal aplikasi **Barber Suite v4.2.0** di perangkat **Android** maupun **iPhone / iPad (iOS)**.

---

## Ringkasan File Build

| Platform | Nama File / Lokasi | Keterangan |
| :--- | :--- | :--- |
| **Android (Utama)** | `Barber-Suite-v4.2.0.apk` | APK rilis yang sudah ditandatangani (*signed release*), ukuran ~11 MB, siap instal di semua HP/Tablet Android. |
| **Android (Debug)** | `Barber-Suite-v4.2.0-debug.apk` | APK versi debug untuk keperluan pengujian/teknisi. |
| **iOS (Xcode Project)** | `ios/App/App.xcodeproj` | Proyek native iOS untuk di-compile dan di-install ke iPhone/iPad menggunakan Xcode di Mac. |

---

## 1. Cara Install di Android (HP / Tablet)

### Metode A: Install Langsung di HP Android (Paling Mudah)

1. **Kirim file APK ke HP Android**
   Salin file **`Barber-Suite-v4.2.0.apk`** dari Mac/komputer ke HP Android Anda menggunakan salah satu cara berikut:
   - Kirim melalui **WhatsApp** (kirim sebagai *Dokumen/File*), **Telegram**, atau **Google Drive**.
   - Atau hubungkan HP ke komputer menggunakan **kabel data USB** lalu salin ke folder `Download`.

2. **Buka File APK**
   - Buka aplikasi **File Saya / File Manager** di HP Android (atau ketuk langsung file `Barber-Suite-v4.2.0.apk` dari WhatsApp/Unduhan).

3. **Izinkan Instalasi dari Sumber Tidak Dikenal (Jika Diminta)**
   - Jika muncul pesan *"Demi keamanan, ponsel Anda tidak diizinkan menginstal aplikasi yang tidak dikenal dari sumber ini"*:
     1. Ketuk tombol **Setelan (Settings)** pada pop-up tersebut.
     2. Aktifkan sakelar **"Izinkan dari sumber ini" (Allow from this source)**.
     3. Tekan tombol **Kembali (Back)**.

4. **Jalankan Instalasi**
   - Ketuk tombol **Instal (Install)** — atau **Update** jika Anda sudah menginstal versi sebelumnya.
   - **Catatan Google Play Protect**: Jika muncul peringatan *Google Play Protect* karena aplikasi diinstal di luar Play Store, ketuk **Detail lainnya (More details)** lalu pilih **Tetap instal (Install anyway)**.

5. **Selesai**
   - Setelah proses instalasi selesai, ketuk **Buka (Open)**. Aplikasi **Barber Suite** siap digunakan secara penuh (100% berjalan offline di perangkat).

---

### Metode B: Install dari Mac/PC via Kabel USB (ADB)

Jika HP Android terhubung ke Mac dengan kabel USB dan fitur **USB Debugging** sudah aktif:

```bash
cd "/Users/mac/Documents/muk app/BMS"
adb install -r Barber-Suite-v4.2.0.apk
```
> Flag `-r` akan memperbarui aplikasi secara langsung tanpa menghapus data transaksi yang sudah tersimpan di dalam HP.

---

## 2. Cara Install di iPhone / iPad (iOS)

Karena kebijakan sistem operasi Apple (iOS), aplikasi iPhone tidak menggunakan file `.apk`, melainkan di-install melalui **Xcode** di Mac, file **`.ipa`**, atau sebagai **Web App (PWA)**. Berikut 3 cara yang dapat Anda gunakan:

---

### Metode A: Install Aplikasi Native ke iPhone Menggunakan Xcode di Mac (Rekomendasi)

Anda dapat menginstal aplikasi native langsung dari Mac ini ke iPhone/iPad menggunakan kabel data dan akun Apple ID biasa (gratis) maupun akun Apple Developer.

#### Langkah 1: Persiapan di Mac
1. Pastikan aplikasi **Xcode** sudah terpasang di Mac Anda (dapat diunduh gratis melalui **Mac App Store**).
2. Buka Terminal dan jalankan perintah berikut untuk membuka proyek iOS di Xcode:
   ```bash
   cd "/Users/mac/Documents/muk app/BMS"
   npx cap open ios
   ```
   *(Atau klik dua kali file `ios/App/App.xcodeproj` melalui Finder).*

#### Langkah 2: Persiapan di iPhone
1. Hubungkan iPhone ke Mac menggunakan kabel USB / Type-C.
2. Jika muncul pop-up di layar iPhone, ketuk **Trust (Percayai Komputer Ini)** dan masukkan passcode iPhone Anda.
3. **Khusus iOS 16 / iOS 17 / iOS 18 ke atas (Aktifkan Developer Mode)**:
   - Buka **Settings (Pengaturan)** $\rightarrow$ **Privacy & Security (Privasi & Keamanan)**.
   - Gulir ke paling bawah, pilih **Developer Mode (Mode Pengembang)** dan ubah menjadi **ON**.
   - Restart iPhone Anda, lalu setelah menyala kembali ketuk **Turn On (Aktifkan)** dan masukkan passcode.

#### Langkah 3: Pengaturan Signing (Tanda Tangan Digital) di Xcode
1. Di Xcode, klik ikon proyek **App** di panel sebelah kiri (*Project Navigator*).
2. Pilih target **App**, lalu buka tab **Signing & Capabilities** di bagian atas.
3. Centang opsi **Automatically manage signing**.
4. Pada dropdown **Team**:
   - Jika belum ada akun, klik **Add an Account...**, lalu login menggunakan **Apple ID** Anda.
   - Pilih nama akun Anda pada kolom **Team**.
5. Pada kolom **Bundle Identifier**, pastikan terisi `com.kriakarya.barbersuite` *(jika menggunakan Apple ID gratis dan muncul pesan bahwa identifier sudah dipakai, ubah menjadi unik, misalnya `com.kriakarya.barbersuite.toko1`)*.

#### Langkah 4: Install (Run) ke iPhone
1. Pada bilah atas (toolbar) Xcode, klik daftar perangkat di sebelah nama **App**, lalu pilih **nama iPhone Anda** (bukan Simulator).
2. Klik tombol **Run (ikon segitiga ▶)** di pojok kiri atas Xcode (atau tekan `Cmd + R`).
3. Tunggu hingga Xcode selesai melakukan kompilasi dan menginstal aplikasi ke iPhone Anda.

#### Langkah 5: Percayai Sertifikat Developer di iPhone (Jika Menggunakan Apple ID Gratis)
Jika saat pertama kali membuka aplikasi di iPhone muncul pesan *"Untrusted Developer" (Pengembang Tidak Dipercaya)*:
1. Di iPhone, buka **Settings (Pengaturan)** $\rightarrow$ **General (Umum)** $\rightarrow$ **VPN & Device Management (Manajemen VPN & Perangkat)**.
2. Di bawah bagian **Developer App**, ketuk nama akun Apple ID Anda.
3. Ketuk **Trust "<Apple ID Anda>"**, lalu konfirmasi dengan mengetuk **Trust (Percayai)**.
4. Kembali ke layar utama iPhone dan buka aplikasi **Barber Suite**.

---

### Metode B: Ekspor File `.ipa` (Untuk Sideloadly / AltStore / TestFlight)

Jika Anda ingin menghasilkan file `.ipa` dari Xcode:
1. Buka `ios/App/App.xcodeproj` di Xcode.
2. Pilih target perangkat **Any iOS Device (arm64)** di toolbar atas Xcode.
3. Klik menu **Product** $\rightarrow$ **Archive**.
4. Setelah proses *Archive* selesai, jendela **Organizer** akan terbuka:
   - Klik **Distribute App**.
   - Pilih **Debugging** / **Release Testing (Ad Hoc)** atau **App Store Connect (TestFlight)**, lalu ikuti langkah hingga file `App.ipa` berhasil diekspor.
5. File `.ipa` tersebut dapat di-install ke iPhone menggunakan aplikasi **Apple Configurator 2**, **Sideloadly**, atau **TestFlight**.

---

### Metode C: Install Cepat di iPhone via Safari (Tanpa Xcode / Tanpa Kabel)

Jika Anda ingin langsung memasang aplikasi di layar utama iPhone melalui jaringan Wi-Fi lokal atau server tanpa menggunakan Xcode:
1. Pastikan server aplikasi sedang berjalan (misalnya di alamat jaringan lokal `http://192.168.1.4:5173/` atau domain HTTPS Anda).
2. Buka browser **Safari** di iPhone dan kunjungi alamat tersebut.
3. Ketuk tombol **Share (Bagikan)** di bagian bawah layar Safari (ikon kotak dengan panah menghadap ke atas).
4. Gulir ke bawah dan pilih **Add to Home Screen (Tambah ke Layar Utama)**.
5. Pastikan namanya **Barber Suite**, lalu ketuk **Add (Tambah)** di pojok kanan atas.
6. Ikon **Barber Suite** akan muncul di layar utama iPhone seperti aplikasi native penuh tanpa bilah alamat browser.

---

## 3. Panduan Update & Keamanan Data

- **Cara Update Versi Baru Tanpa Kehilangan Data**:
  Saat menginstal versi pembaruan (`Barber-Suite-v4.2.0.apk`), **jangan meng-uninstall aplikasi lama terlebih dahulu**. Langsung buka dan instal file APK baru di atas aplikasi yang sudah ada agar seluruh database SQLite lokal (transaksi, pelanggan, layanan, barber, dan pengaturan) tetap utuh.
- **Backup Data Secara Berkala**:
  Gunakan menu **Lainnya $\rightarrow$ Backup & Restore $\rightarrow$ Ekspor Backup Sekarang (.json)** untuk menyimpan salinan cadangan data toko Anda ke penyimpanan perangkat atau WhatsApp/Google Drive.

