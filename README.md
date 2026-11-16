# Ledgerly

Ledgerly adalah jurnal trading berbasis web/PWA dengan paket desktop Windows berbasis Electron.

## Mode web dan PWA

Jalankan [Start Ledgerly.bat](./Start%20Ledgerly.bat) untuk membuka versi web melalui server lokal Python. Service worker dan instalasi PWA tetap aktif pada mode ini.

## Mode desktop Electron

Persyaratan: Node.js 20 atau lebih baru.

```powershell
npm install
npm run icons
npm run dev
```

Mode desktop tidak membutuhkan Python. Renderer menggunakan `contextIsolation`, `sandbox`, `webSecurity`, dan `nodeIntegration: false`. Service worker dan pemeriksaan `version.json` dinonaktifkan di Electron.

## Membuat installer

```powershell
npm run dist
```

Installer NSIS dan versi portable dibuat di folder `dist`. Windows SmartScreen dapat menampilkan peringatan untuk aplikasi yang belum ditandatangani. Untuk distribusi publik, gunakan sertifikat code signing.

## Data pengguna

Data desktop disimpan di folder Electron `userData`, biasanya:

```text
%APPDATA%\Ledgerly\
```

File utama adalah `ledgerly-storage.json`. Backup otomatis bergulir disimpan di `%APPDATA%\Ledgerly\backups\` dengan maksimal tujuh salinan terbaru.

Backup JSON dari versi web dapat diimpor melalui tombol **Import JSON**. Format key `jurnalcuan_v1`, `jurnalcuan_set`, `jurnalcuan_acc`, dan format transaksi tetap dipertahankan.

Riwayat juga dapat diekspor sebagai CSV atau diimpor kembali melalui tombol **Ekspor CSV** dan **Import CSV**.

API key Marketstack pada desktop disimpan menggunakan enkripsi OS Electron `safeStorage`; key tidak dikirim ke renderer. Pada versi web, key tetap disimpan sesuai mekanisme browser.

## Pengujian

```powershell
npm test
```

Versi web memuat entry point ES module di `src/main.js`. Modul murni perhitungan dan format berada di `src/calc.js` dan `src/format.js`, dan tesnya berjalan tanpa framework tambahan.

## Keamanan desktop

Renderer Electron berjalan dengan `contextIsolation`, `sandbox`, `nodeIntegration: false`, dan `webSecurity: true`. IPC membatasi key storage ke key Ledgerly yang sudah ada, membatasi jaringan ke origin API yang diperlukan, menolak popup/navigasi eksternal, menolak permission browser, memvalidasi simbol Marketstack, dan membatasi ukuran respons jaringan.

API key Marketstack disimpan menggunakan `safeStorage` Electron. Audit dependensi produksi dapat diperiksa dengan `npm audit --omit=dev`; dependensi builder hanya diperlukan saat membuat installer dan tidak dikirim sebagai dependensi runtime aplikasi.

## Pembaruan otomatis desktop

Untuk pemakaian pribadi, updater menggunakan server lokal laptop di `http://127.0.0.1:8765/`. Server hanya menerima koneksi dari laptop sendiri dan hanya menyajikan `latest.yml`, installer NSIS, serta blockmap.

Untuk menerbitkan update lokal:

1. Naikkan `version` di `package.json` dan `version.json`.
2. Jalankan `npm run dist`.
3. Pastikan nama installer dan blockmap yang dirujuk `dist/latest.yml` ada di folder `dist`.
4. Jalankan `npm run update-server` dan biarkan terminal tetap terbuka.
5. Buka Ledgerly terpasang lalu pilih **File → Periksa pembaruan**.

Update otomatis hanya berjalan saat server lokal aktif. `npm run dev` tidak memakai updater.
