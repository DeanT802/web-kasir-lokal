const { db } = require("../db/koneksi");

// Ambil daftar meja aktif.
function daftarMeja(req, res) {
  try {
    const daftar = db.prepare("SELECT * FROM meja ORDER BY nama").all();
    res.json(daftar);
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengambil meja", error: error.message });
  }
}

// Tambah meja baru.
function tambahMeja(req, res) {
  try {
    const { nama } = req.body;
    if (!nama) {
      return res.status(400).json({ pesan: "Nama meja wajib diisi" });
    }

    const hasil = db.prepare("INSERT INTO meja (nama) VALUES (?)").run(nama);
    res.status(201).json({ id: hasil.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ pesan: "Gagal menambah meja", error: error.message });
  }
}

// Ubah status/ nama meja.
function ubahMeja(req, res) {
  try {
    const { id } = req.params;
    const { nama, aktif } = req.body;

    const hasil = db
      .prepare("UPDATE meja SET nama = ?, aktif = ? WHERE id = ?")
      .run(nama, aktif ? 1 : 0, id);

    res.json({ perubahan: hasil.changes });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengubah meja", error: error.message });
  }
}

// Hapus meja.
function hapusMeja(req, res) {
  try {
    const { id } = req.params;
    const hasil = db.prepare("DELETE FROM meja WHERE id = ?").run(id);
    res.json({ perubahan: hasil.changes });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal menghapus meja", error: error.message });
  }
}

module.exports = {
  daftarMeja,
  tambahMeja,
  ubahMeja,
  hapusMeja,
};
