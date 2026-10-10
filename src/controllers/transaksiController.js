const { db } = require("../db/koneksi");

// Helper validasi format tanggal YYYY-MM-DD
function formatTanggalValid(tgl) {
  if (!tgl || typeof tgl !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(tgl);
}

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

// Helper filter transaksi untuk preview & delete
function cariTransaksiBerdasarkanKriteria(kriteria) {
  const { type, ids, mode, tanggal, tanggal_mulai, tanggal_selesai } = kriteria;

  if (type === "ids") {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Daftar ID transaksi tidak valid atau kosong");
    }
    const cleanIds = ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id) && id > 0);
    if (cleanIds.length === 0) {
      throw new Error("Tidak ada ID transaksi valid yang diberikan");
    }
    const placeholders = cleanIds.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT id, tanggal_waktu, total_harga
         FROM transactions
         WHERE id IN (${placeholders})
         ORDER BY id ASC`
      )
      .all(...cleanIds);
    return { rows, cleanIds };
  }

  if (type === "date_range") {
    if (mode === "single" || (!mode && tanggal)) {
      if (!formatTanggalValid(tanggal)) {
        throw new Error("Format tanggal tidak valid (harus YYYY-MM-DD)");
      }
      const rows = db
        .prepare(
          `SELECT id, tanggal_waktu, total_harga
           FROM transactions
           WHERE date(tanggal_waktu) = ?
           ORDER BY id ASC`
        )
        .all(tanggal);
      return { rows, tanggal };
    }

    if (mode === "range" || (!mode && tanggal_mulai && tanggal_selesai)) {
      if (!formatTanggalValid(tanggal_mulai) || !formatTanggalValid(tanggal_selesai)) {
        throw new Error("Format tanggal mulai atau tanggal selesai tidak valid (harus YYYY-MM-DD)");
      }
      let tMulai = tanggal_mulai;
      let tSelesai = tanggal_selesai;
      if (tMulai > tSelesai) {
        [tMulai, tSelesai] = [tSelesai, tMulai];
      }
      const rows = db
        .prepare(
          `SELECT id, tanggal_waktu, total_harga
           FROM transactions
           WHERE date(tanggal_waktu) >= ? AND date(tanggal_waktu) <= ?
           ORDER BY id ASC`
        )
        .all(tMulai, tSelesai);
      return { rows, tanggal_mulai: tMulai, tanggal_selesai: tSelesai };
    }

    throw new Error("Kriteria tanggal tidak lengkap");
  }

  if (type === "all") {
    const rows = db
      .prepare("SELECT id, tanggal_waktu, total_harga FROM transactions ORDER BY id ASC")
      .all();
    return { rows };
  }

  throw new Error("Tipe penghapusan tidak didukung (harus 'ids', 'date_range', atau 'all')");
}

// Pratinjau kalkulasi jumlah & total nominal sebelum penghapusan
function previewHapusTransaksi(req, res) {
  try {
    const kriteria = req.body || {};
    const { rows } = cariTransaksiBerdasarkanKriteria(kriteria);

    const total_transaksi = rows.length;
    const total_nominal = rows.reduce((sum, item) => sum + (item.total_harga || 0), 0);
    const ids = rows.map((r) => r.id);

    let tanggal_info = "-";
    if (kriteria.type === "all") {
      tanggal_info = total_transaksi > 0 ? "Seluruh Riwayat Transaksi" : "Tidak ada transaksi";
    } else if (kriteria.type === "ids") {
      tanggal_info = `${total_transaksi} transaksi terpilih`;
    } else if (kriteria.type === "date_range") {
      if (kriteria.mode === "single" || kriteria.tanggal) {
        tanggal_info = `Tanggal ${kriteria.tanggal}`;
      } else {
        tanggal_info = `Rentang ${kriteria.tanggal_mulai} s/d ${kriteria.tanggal_selesai}`;
      }
    }

    res.json({
      sukses: true,
      total_transaksi,
      total_nominal,
      tanggal_info,
      ids,
    });
  } catch (error) {
    res.status(400).json({ sukses: false, pesan: error.message });
  }
}

// Eksekusi penghapusan transaksi
function hapusTransaksi(req, res) {
  try {
    let kriteria = req.body || {};
    if (req.params && req.params.id) {
      kriteria = { type: "ids", ids: [req.params.id] };
    }

    const { rows } = cariTransaksiBerdasarkanKriteria(kriteria);

    if (rows.length === 0) {
      return res.status(404).json({
        sukses: false,
        pesan: "Tidak ada transaksi yang cocok untuk dihapus",
        total_terhapus: 0,
        total_nominal: 0,
      });
    }

    const targetIds = rows.map((r) => r.id);
    const total_nominal = rows.reduce((sum, item) => sum + (item.total_harga || 0), 0);
    const total_terhapus = targetIds.length;

    // Database transaction untuk menghapus transaction_items dan transactions secara atomik
    const eksekusiHapus = db.transaction((ids) => {
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => "?").join(",");

        db.prepare(`DELETE FROM transaction_items WHERE transaction_id IN (${placeholders})`).run(...chunk);
        db.prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`).run(...chunk);
      }
    });

    eksekusiHapus(targetIds);

    res.json({
      sukses: true,
      pesan: `Berhasil menghapus ${total_terhapus} transaksi`,
      total_terhapus,
      total_nominal,
      ids_terhapus: targetIds,
    });
  } catch (error) {
    res.status(400).json({ sukses: false, pesan: error.message });
  }
}

module.exports = {
  daftarTransaksi,
  detailTransaksi,
  previewHapusTransaksi,
  hapusTransaksi,
};
