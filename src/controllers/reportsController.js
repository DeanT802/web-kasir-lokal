const { db } = require("../db/koneksi");

// Laporan pemasukan harian dan estimasi HPP (jika tersedia).
function laporanHarian(req, res) {
  try {
    const { tanggal } = req.query;

    let data;
    if (tanggal) {
      data = db
        .prepare(
          `SELECT date(tanggal_waktu) AS tanggal,
                  SUM(total_harga) AS pemasukan,
                  COUNT(*) AS total_transaksi
           FROM transactions
           WHERE date(tanggal_waktu) = ?
           GROUP BY date(tanggal_waktu)`
        )
        .get(tanggal);

      if (!data) {
        return res.json({ tanggal, pemasukan: 0, hpp: 0, laba_kotor: 0 });
      }

      const totalItem = db
        .prepare(
          `SELECT COALESCE(SUM(transaction_items.kuantitas), 0) AS total_item
           FROM transaction_items
           JOIN transactions ON transactions.id = transaction_items.transaction_id
           WHERE date(transactions.tanggal_waktu) = ?`
        )
        .get(tanggal);

      const hpp = 0; // Placeholder HPP: belum ada kolom pembelian.
      return res.json({
        tanggal: data.tanggal,
        pemasukan: data.pemasukan ?? 0,
        total_transaksi: data.total_transaksi ?? 0,
        total_item: totalItem.total_item ?? 0,
        hpp,
        laba_kotor: (data.pemasukan ?? 0) - hpp,
      });
    }

    data = db
      .prepare(
        `SELECT date(transactions.tanggal_waktu) AS tanggal,
                SUM(transactions.total_harga) AS pemasukan,
                COUNT(DISTINCT transactions.id) AS total_transaksi,
                COALESCE(SUM(transaction_items.kuantitas), 0) AS total_item
         FROM transactions
         LEFT JOIN transaction_items ON transaction_items.transaction_id = transactions.id
         GROUP BY date(transactions.tanggal_waktu)
         ORDER BY tanggal DESC`
      )
      .all();

    const laporan = data.map((item) => {
      const hpp = 0; // Placeholder HPP.
      return {
        tanggal: item.tanggal,
        pemasukan: item.pemasukan ?? 0,
        total_transaksi: item.total_transaksi ?? 0,
        total_item: item.total_item ?? 0,
        hpp,
        laba_kotor: (item.pemasukan ?? 0) - hpp,
      };
    });

    res.json({ laporan });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengambil laporan", error: error.message });
  }
}

// Laporan item terjual per hari untuk menu terlaris.
function laporanItemHarian(req, res) {
  try {
    const { tanggal } = req.query;
    const filterTanggal = tanggal ? `WHERE date(transactions.tanggal_waktu) = ?` : "";

    const query = `
      SELECT menus.id AS menu_id,
             menus.nama AS nama,
             COALESCE(SUM(transaction_items.kuantitas), 0) AS total_terjual,
             COALESCE(SUM(transaction_items.subtotal), 0) AS total_penjualan
      FROM transaction_items
      JOIN menus ON menus.id = transaction_items.menu_id
      JOIN transactions ON transactions.id = transaction_items.transaction_id
      ${filterTanggal}
      GROUP BY menus.id, menus.nama
      ORDER BY total_terjual DESC
      LIMIT 20
    `;

    const items = tanggal
      ? db.prepare(query).all(tanggal)
      : db.prepare(query).all();

    res.json({ items });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengambil rekap item", error: error.message });
  }
}

module.exports = {
  laporanHarian,
  laporanItemHarian,
};
