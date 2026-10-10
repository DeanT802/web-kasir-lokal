const { db, inisialisasiDatabase } = require("../src/db/koneksi");

// Script kecil untuk mengisi menu demo agar UI bisa langsung dipakai.
inisialisasiDatabase();

const dataMenu = [
  { nama: "Americano", kategori: "kopi", harga: 22000, stok: 20 },
  { nama: "Cappuccino", kategori: "kopi", harga: 26000, stok: 18 },
  { nama: "Latte", kategori: "kopi", harga: 25000, stok: 25 },
  { nama: "Croissant", kategori: "makanan", harga: 18000, stok: 12 },
  { nama: "Banana Bread", kategori: "makanan", harga: 20000, stok: 10 },
  { nama: "Cookies", kategori: "snack", harga: 12000, stok: 30 },
];

const dataMeja = [
  { nama: "Meja 1" },
  { nama: "Meja 2" },
  { nama: "Meja 3" },
];

const stmt = db.prepare(
  "INSERT INTO menus (nama, kategori, harga, stok) VALUES (?, ?, ?, ?)"
);

const transaksi = db.transaction(() => {
  for (const menu of dataMenu) {
    stmt.run(menu.nama, menu.kategori, menu.harga, menu.stok);
  }

  const stmtMeja = db.prepare("INSERT OR IGNORE INTO meja (nama) VALUES (?)");
  for (const meja of dataMeja) {
    stmtMeja.run(meja.nama);
  }
});

transaksi();
console.log("Seed demo selesai.");
