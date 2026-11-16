# Panduan Build Android (APK)

## 1. Prasyarat
- JDK 17
- Android Studio dengan Android SDK (minSdkVersion 23+)

## 2. Langkah Build
```bash
npm install
npm run build
npx cap add android   # jalankan sekali
npx cap sync android
```

## 3. Konfigurasi Izin Minimum (`android/app/src/main/AndroidManifest.xml`)
- `POST_NOTIFICATIONS` untuk pengingat backup berkala (Android 13+).
- Tidak memerlukan izin penyimpanan luas karena file backup/ekspor disimpan via `Directory.Documents` dan dibagikan lewat Share Sheet.

## 4. Build Debug / Release APK
Via Android Studio:
```bash
npx cap open android
```
Lalu pilih **Build > Build Bundle(s)/APK(s) > Build APK(s)** atau **Build > Generate Signed Bundle / APK**.

Via CLI:
```bash
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

