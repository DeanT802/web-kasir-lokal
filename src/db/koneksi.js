const path = require("path");
const Database = require("better-sqlite3");

const lokasiDb = path.join(__dirname, "../../data/kasir.db");
const db = new Database(lokasiDb);

// Tambah kolom baru jika belum ada (untuk kebutuhan migrasi ringan).
function tambahKolomJikaBelumAda(namaTabel, namaKolom, definisiKolom) {
  const kolom = db.prepare(`PRAGMA table_info(${namaTabel})`).all();
  const sudahAda = kolom.some((item) => item.name === namaKolom);

  if (!sudahAda) {
    db.exec(`ALTER TABLE ${namaTabel} ADD COLUMN ${namaKolom} ${definisiKolom};`);
  }
}

// Inisialisasi tabel utama jika belum ada.
function inisialisasiDatabase() {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  // Tabel menu: menyimpan daftar item jualan.
  db.exec(`
    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      kategori TEXT NOT NULL CHECK (kategori IN ('kopi', 'makanan', 'non-kopi', 'snack')),
      harga INTEGER NOT NULL,
      stok INTEGER NOT NULL DEFAULT 0,
      gambar_url TEXT,
      aktif INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Pastikan kolom aktif tersedia untuk soft delete menu.
  tambahKolomJikaBelumAda("menus", "aktif", "INTEGER NOT NULL DEFAULT 1");

  // Tabel transaksi: header transaksi per checkout.
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal_waktu TEXT NOT NULL,
      total_harga INTEGER NOT NULL,
      metode_pembayaran TEXT NOT NULL,
      meja_id INTEGER,
      meja_nama TEXT
    );
  `);

  // Pastikan kolom tambahan tersedia jika database lama sudah ada.
  tambahKolomJikaBelumAda("transactions", "meja_id", "INTEGER");
  tambahKolomJikaBelumAda("transactions", "meja_nama", "TEXT");

  // Tabel detail transaksi: item per transaksi.
  db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      menu_id INTEGER NOT NULL,
      kuantitas INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE RESTRICT
    );
  `);

  // Tabel meja: daftar meja untuk pemilihan kasir.
  db.exec(`
    CREATE TABLE IF NOT EXISTS meja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL UNIQUE,
      aktif INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Log perubahan stok agar bisa dilacak.
  db.exec(`
    CREATE TABLE IF NOT EXISTS stok_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_id INTEGER NOT NULL,
      perubahan INTEGER NOT NULL,
      stok_awal INTEGER NOT NULL,
      stok_akhir INTEGER NOT NULL,
      catatan TEXT,
      tanggal_waktu TEXT NOT NULL,
      FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
    );
  `);

  // Shift kasir untuk rekap buka/tutup.
  db.exec(`
    CREATE TABLE IF NOT EXISTS shift_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buka_waktu TEXT NOT NULL,
      tutup_waktu TEXT,
      saldo_awal INTEGER NOT NULL DEFAULT 0,
      saldo_akhir INTEGER,
      total_transaksi INTEGER NOT NULL DEFAULT 0,
      total_item INTEGER NOT NULL DEFAULT 0,
      catatan TEXT,
      status TEXT NOT NULL DEFAULT 'open'
    );
  `);
}

module.exports = {
  db,
  inisialisasiDatabase,
};
