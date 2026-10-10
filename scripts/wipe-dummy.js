const { db, inisialisasiDatabase } = require("../src/db/koneksi");

// Script untuk menghapus data dummy (menu, transaksi, log). HATI-HATI: permanen.
inisialisasiDatabase();

const transaksi = db.transaction(() => {
  db.exec("DELETE FROM transaction_items;");
  db.exec("DELETE FROM transactions;");
  db.exec("DELETE FROM stok_logs;");
  db.exec("DELETE FROM shift_logs;");
  db.exec("DELETE FROM menus;");
  db.exec("DELETE FROM meja;");
  db.exec("DELETE FROM sqlite_sequence;");
});

transaksi();
console.log("Semua data dummy sudah dihapus.");
