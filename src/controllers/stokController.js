const { db } = require("../db/koneksi");

// Ubah stok manual (untuk kasir) + simpan log perubahan.
function ubahStok(req, res) {
  try {
    const { id } = req.params;
    const { perubahan, catatan } = req.body;

    if (!Number.isInteger(perubahan)) {
      return res.status(400).json({ pesan: "Perubahan stok harus angka" });
    }

    db.prepare("BEGIN").run();

    const menu = db.prepare("SELECT * FROM menus WHERE id = ?").get(id);
    if (!menu) {
      throw new Error("Menu tidak ditemukan");
    }

    const stokAwal = menu.stok;
    const stokAkhir = stokAwal + perubahan;

    if (stokAkhir < 0) {
      throw new Error("Stok tidak boleh minus");
    }

    db.prepare("UPDATE menus SET stok = ? WHERE id = ?").run(stokAkhir, id);

    db.prepare(
      "INSERT INTO stok_logs (menu_id, perubahan, stok_awal, stok_akhir, catatan, tanggal_waktu) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, perubahan, stokAwal, stokAkhir, catatan || null, new Date().toISOString());

    db.prepare("COMMIT").run();

    res.json({ stok_awal: stokAwal, stok_akhir: stokAkhir });
  } catch (error) {
    db.prepare("ROLLBACK").run();
    res.status(400).json({ pesan: error.message });
  }
}

// Ambil log perubahan stok.
function daftarLogStok(req, res) {
  try {
    const { menu_id } = req.query;
    let data;

    if (menu_id) {
      data = db
        .prepare(
          `SELECT stok_logs.*, menus.nama AS nama_menu
           FROM stok_logs
           JOIN menus ON menus.id = stok_logs.menu_id
           WHERE menu_id = ?
           ORDER BY tanggal_waktu DESC`
        )
        .all(menu_id);
    } else {
      data = db
        .prepare(
          `SELECT stok_logs.*, menus.nama AS nama_menu
           FROM stok_logs
           JOIN menus ON menus.id = stok_logs.menu_id
           ORDER BY tanggal_waktu DESC
           LIMIT 200`
        )
        .all();
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengambil log stok", error: error.message });
  }
}

module.exports = {
  ubahStok,
  daftarLogStok,
};
