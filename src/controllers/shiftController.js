const { db } = require("../db/koneksi");

// Ambil shift aktif (jika ada).
function shiftAktif(req, res) {
  try {
    const shift = db
      .prepare("SELECT * FROM shift_logs WHERE status = 'open' ORDER BY id DESC LIMIT 1")
      .get();
    res.json(shift || null);
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengambil shift aktif", error: error.message });
  }
}

// Buka shift baru.
function bukaShift(req, res) {
  try {
    const { saldo_awal, catatan } = req.body;

    const shiftAda = db
      .prepare("SELECT id FROM shift_logs WHERE status = 'open' LIMIT 1")
      .get();
    if (shiftAda) {
      return res.status(400).json({ pesan: "Shift masih terbuka" });
    }

    const hasil = db
      .prepare(
        "INSERT INTO shift_logs (buka_waktu, saldo_awal, catatan, status) VALUES (?, ?, ?, 'open')"
      )
      .run(new Date().toISOString(), saldo_awal || 0, catatan || null);

    res.status(201).json({ id: hasil.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal membuka shift", error: error.message });
  }
}

// Tutup shift aktif dan hitung rekap transaksi.
function tutupShift(req, res) {
  try {
    const { saldo_akhir, catatan } = req.body;

    const shift = db
      .prepare("SELECT * FROM shift_logs WHERE status = 'open' ORDER BY id DESC LIMIT 1")
      .get();

    if (!shift) {
      return res.status(400).json({ pesan: "Tidak ada shift aktif" });
    }

    const rekap = db
      .prepare(
        `SELECT COUNT(*) AS total_transaksi,
                COALESCE(SUM(total_harga), 0) AS total_omzet
         FROM transactions
         WHERE datetime(tanggal_waktu) >= datetime(?)
           AND datetime(tanggal_waktu) <= datetime(?)`
      )
      .get(shift.buka_waktu, new Date().toISOString());

    const totalItem = db
      .prepare(
        `SELECT COALESCE(SUM(transaction_items.kuantitas), 0) AS total_item
         FROM transaction_items
         JOIN transactions ON transactions.id = transaction_items.transaction_id
         WHERE datetime(transactions.tanggal_waktu) >= datetime(?)
           AND datetime(transactions.tanggal_waktu) <= datetime(?)`
      )
      .get(shift.buka_waktu, new Date().toISOString());

    db.prepare(
      "UPDATE shift_logs SET tutup_waktu = ?, saldo_akhir = ?, total_transaksi = ?, total_item = ?, status = 'closed', catatan = ? WHERE id = ?"
    ).run(
      new Date().toISOString(),
      saldo_akhir || 0,
      rekap.total_transaksi || 0,
      totalItem.total_item || 0,
      catatan || null,
      shift.id
    );

    res.json({
      id: shift.id,
      total_transaksi: rekap.total_transaksi || 0,
      total_item: totalItem.total_item || 0,
      total_omzet: rekap.total_omzet || 0,
    });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal menutup shift", error: error.message });
  }
}

module.exports = {
  shiftAktif,
  bukaShift,
  tutupShift,
};
