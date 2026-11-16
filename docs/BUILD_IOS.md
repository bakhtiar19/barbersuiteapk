# Panduan Build iOS (Xcode)

## 1. Prasyarat
- macOS dengan Xcode 15+
- CocoaPods (`sudo gem install cocoapods` atau Homebrew)
- Akun Apple Developer (akun gratis cukup untuk pengujian di perangkat sendiri)

## 2. Langkah Build
```bash
npm install
npm run build
npx cap add ios       # jalankan sekali
npx cap sync ios
npx cap open ios
```

## 3. Pengaturan `Info.plist`
Pastikan entri berikut ditambahkan pada target `App`:
- `UIFileSharingEnabled` = `YES`
- `LSSupportsOpeningDocumentsInPlace` = `YES`
- `LSApplicationQueriesSchemes` berisi `whatsapp`

## 4. Menjalankan & Distribusi
Di Xcode: pilih **Signing & Capabilities > Team**, pilih simulator atau iPhone, lalu tekan **Run**. Untuk rilis: **Product > Archive > Distribute App**.

