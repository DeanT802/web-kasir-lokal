const { db } = require("../db/koneksi");
const { cetakKarcis } = require("../services/printerThermal");

// Proses checkout: simpan transaksi, detail, dan kurangi stok dengan transaksi DB.
function checkout(req, res) {
  const { items, metode_pembayaran, meja_id, uang_diterima, kembalian, mode_cetak } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ pesan: "Item keranjang kosong" });
  }

  const waktuTransaksi = new Date().toISOString();
  let totalHarga = 0;
  let totalItem = 0;
  const detailTransaksi = [];
  let mejaNama = null;

  try {
    // Gunakan transaksi manual agar stok konsisten.
    db.prepare("BEGIN").run();

    // Validasi meja jika dipilih.
    if (meja_id) {
      const meja = db.prepare("SELECT * FROM meja WHERE id = ?").get(meja_id);
      if (!meja) {
        throw new Error("Meja tidak ditemukan");
      }
      mejaNama = meja.nama;
    }

    // Validasi stok dan hitung subtotal.
    for (const item of items) {
      if (!item.menu_id || !Number.isInteger(item.kuantitas) || item.kuantitas <= 0) {
        throw new Error("Data item tidak valid");
      }

      const menu = db.prepare("SELECT * FROM menus WHERE id = ?").get(item.menu_id);

      if (!menu) {
        throw new Error("Menu tidak ditemukan");
      }

      if (menu.stok < item.kuantitas) {
        throw new Error(`Stok tidak cukup untuk ${menu.nama}`);
      }

      const subtotal = menu.harga * item.kuantitas;
      totalHarga += subtotal;
      totalItem += item.kuantitas;

      detailTransaksi.push({
        menu_id: menu.id,
        nama: menu.nama,
        harga: menu.harga,
        kuantitas: item.kuantitas,
        subtotal,
      });

      // Kurangi stok per item.
      db.prepare("UPDATE menus SET stok = stok - ? WHERE id = ?").run(
        item.kuantitas,
        menu.id
      );
    }

    const uangDiterimaNominal = Number(uang_diterima) || totalHarga;
    const kembalianNominal = Number(kembalian) >= 0 ? Number(kembalian) : Math.max(0, uangDiterimaNominal - totalHarga);
    const modeCetakPilihan = mode_cetak === "double" ? "double" : "single";

    // Simpan header transaksi.
    const hasilTransaksi = db
      .prepare(
        "INSERT INTO transactions (tanggal_waktu, total_harga, metode_pembayaran, meja_id, meja_nama, uang_diterima, kembalian, mode_cetak) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        waktuTransaksi,
        totalHarga,
        metode_pembayaran || "tunai",
        meja_id || null,
        mejaNama,
        uangDiterimaNominal,
        kembalianNominal,
        modeCetakPilihan
      );

    const idTransaksi = hasilTransaksi.lastInsertRowid;

    // Simpan detail transaksi.
    const stmtDetail = db.prepare(
      "INSERT INTO transaction_items (transaction_id, menu_id, kuantitas, subtotal) VALUES (?, ?, ?, ?)"
    );

    for (const detail of detailTransaksi) {
      stmtDetail.run(idTransaksi, detail.menu_id, detail.kuantitas, detail.subtotal);
    }

    // Update rekap shift jika ada shift aktif.
    db.prepare(
      "UPDATE shift_logs SET total_transaksi = total_transaksi + 1, total_item = total_item + ? WHERE status = 'open'"
    ).run(totalItem);

    db.prepare("COMMIT").run();

    const hasilCheckout = {
      id_transaksi: idTransaksi,
      tanggal_waktu: waktuTransaksi,
      total_harga: totalHarga,
      metode_pembayaran: metode_pembayaran || "tunai",
      uang_diterima: uangDiterimaNominal,
      kembalian: kembalianNominal,
      mode_cetak: modeCetakPilihan,
      items: detailTransaksi,
      total_item: totalItem,
      meja_id: meja_id || null,
      meja_nama: mejaNama,
    };

    // Cetak karcis setelah transaksi sukses (opsional).
    try {
      cetakKarcis(hasilCheckout);
    } catch (error) {
      // Jangan menggagalkan transaksi jika printer bermasalah.
      console.error("Gagal cetak karcis:", error.message);
    }

    res.status(201).json(hasilCheckout);
  } catch (error) {
    db.prepare("ROLLBACK").run();
    res.status(400).json({ pesan: error.message });
  }
}

module.exports = {
  checkout,
};
