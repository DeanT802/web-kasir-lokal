const { db } = require("../db/koneksi");

// Ambil daftar transaksi dengan ringkas.
function daftarTransaksi(req, res) {
  try {
    const { tanggal } = req.query;

    let data;
    if (tanggal) {
      data = db
        .prepare(
          `SELECT * FROM transactions
           WHERE date(tanggal_waktu) = ?
           ORDER BY tanggal_waktu DESC`
        )
        .all(tanggal);
    } else {
      data = db
        .prepare("SELECT * FROM transactions ORDER BY tanggal_waktu DESC LIMIT 200")
        .all();
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengambil transaksi", error: error.message });
  }
}

// Ambil detail transaksi + item.
function detailTransaksi(req, res) {
  try {
    const { id } = req.params;

    const transaksi = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
    if (!transaksi) {
      return res.status(404).json({ pesan: "Transaksi tidak ditemukan" });
    }

    const items = db
      .prepare(
        `SELECT transaction_items.*, menus.nama
         FROM transaction_items
         JOIN menus ON menus.id = transaction_items.menu_id
         WHERE transaction_id = ?`
      )
      .all(id);

    res.json({ transaksi, items });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengambil detail transaksi", error: error.message });
  }
}

module.exports = {
  daftarTransaksi,
  detailTransaksi,
};
