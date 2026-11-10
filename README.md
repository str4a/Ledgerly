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

API key Marketstack pada desktop disimpan menggunakan enkripsi OS Electron `safeStorage`; key tidak dikirim ke renderer. Pada versi web, key tetap disimpan sesuai mekanisme browser.

## Pengujian

```powershell
npm test
```

Pembaruan otomatis belum diaktifkan. `electron-updater` dapat ditambahkan pada tahap berikutnya setelah proses rilis dan code signing siap.
