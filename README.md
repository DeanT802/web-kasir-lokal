# POS Kopi Lokal

Aplikasi Point of Sale (POS) lokal untuk toko kopi. Project ini disiapkan dengan ExpressJS + SQLite (better-sqlite3) dan akan dilengkapi frontend Vue 3 + Tailwind.

## Status
- Backend Express + SQLite siap.
- Frontend SPA (Vue 3 + Tailwind via CDN) siap.

## Fitur Utama
- CRUD Menu + cek stok
- Checkout menggunakan transaksi database
- Laporan pemasukan harian
- UI kasir layar lebar (grid menu + panel keranjang)
- Manajemen meja, stok, dan shift kasir
- Riwayat transaksi + detail item
- Export rekap harian ke CSV
- Tab khusus tambah menu + upload foto
- Edit dan hapus menu dari UI
- Upload foto menu dibatasi 2MB dan hanya format gambar
- Konfirmasi hapus menu menggunakan modal
- Foto menu otomatis di-resize (lebar maks 800px)
- Foto menu dikompresi JPEG kualitas 80 (client & server)
- Upload menu menampilkan progress bar
- WebP otomatis disajikan jika tersedia
- Deteksi dukungan WebP otomatis di browser
- Hapus menu menggunakan soft delete (menu disembunyikan dari kasir)

## Menjalankan Server
Pastikan Node.js sudah terpasang, lalu jalankan:

```bash
npm install
npm run dev
```

Server akan berjalan di `http://localhost:3000`.

## Endpoint API
- `GET /api/menus` (opsional query `kategori`)
- `POST /api/menus`
- `PUT /api/menus/:id`
- `DELETE /api/menus/:id`
- `GET /api/menus/stok/:id`
- `POST /api/checkout`
- `GET /api/reports` (opsional query `tanggal=YYYY-MM-DD`)
- `GET /api/reports/items` (opsional query `tanggal=YYYY-MM-DD`)
- `GET /api/meja`
- `POST /api/meja`
- `DELETE /api/meja/:id`
- `POST /api/stok/ubah/:id`
- `GET /api/stok/logs`
- `GET /api/transactions`
- `GET /api/transactions/:id`
- `GET /api/shift/aktif`
- `POST /api/shift/open`
- `POST /api/shift/close`

## Script Demo
- `scripts/seed-demo.js` untuk mengisi data menu + meja contoh.
- `scripts/wipe-dummy.js` untuk menghapus data dummy (menu, transaksi, log).
