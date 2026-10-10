const { db } = require("../db/koneksi");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Ambil semua menu yang tersedia.
function daftarMenu(req, res) {
  try {
    const { kategori } = req.query;
    const tampilkanSemua = req.query.semua === "1";
    let daftar;

    if (kategori) {
      daftar = db
        .prepare(
          "SELECT * FROM menus WHERE kategori = ? AND (aktif = 1 OR ?) ORDER BY nama"
        )
        .all(kategori, tampilkanSemua ? 1 : 0);
    } else {
      daftar = db
        .prepare("SELECT * FROM menus WHERE aktif = 1 OR ? ORDER BY kategori, nama")
        .all(tampilkanSemua ? 1 : 0);
    }

    const daftarDenganWebp = daftar.map((menu) => {
      if (!menu.gambar_url) {
        return { ...menu, gambar_webp: null };
      }
      const lokasi = path.join(
        __dirname,
        "../../public",
        menu.gambar_url.replace(/\//g, path.sep)
      );
      const lokasiWebp = lokasi.replace(/\.jpg$/i, ".webp");
      const adaWebp = fs.existsSync(lokasiWebp);
      return {
        ...menu,
        gambar_webp: adaWebp ? menu.gambar_url.replace(/\.jpg$/i, ".webp") : null,
      };
    });

    res.json(daftarDenganWebp);
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengambil menu", error: error.message });
  }
}

// Tambah menu baru.
async function tambahMenu(req, res) {
  try {
    const { nama, kategori, harga, stok, gambar_url } = req.body;
    const hargaFinal = parseInt(harga, 10);
    const stokFinal = parseInt(stok ?? 0, 10);
    let gambarFinal = req.file
      ? `/uploads/${req.file.filename}`
      : gambar_url || null;

    if (req.file?.path) {
      try {
        const pipeline = sharp(req.file.path).resize({ width: 800, withoutEnlargement: true });
        const bufferJpg = await pipeline.clone().jpeg({ quality: 80 }).toBuffer();
        fs.writeFileSync(req.file.path, bufferJpg);

        const webpPath = req.file.path.replace(/\.jpg$/i, ".webp");
        const bufferWebp = await pipeline.clone().webp({ quality: 80 }).toBuffer();
        fs.writeFileSync(webpPath, bufferWebp);
      } catch (error) {
        console.error("Gagal memproses gambar menu:", error.message);
      }
    }

    if (!nama || !kategori || Number.isNaN(hargaFinal)) {
      return res.status(400).json({ pesan: "Nama, kategori, dan harga wajib diisi" });
    }
    const hasil = db
      .prepare(
        "INSERT INTO menus (nama, kategori, harga, stok, gambar_url) VALUES (?, ?, ?, ?, ?)"
      )
  .run(nama, kategori, hargaFinal, Number.isNaN(stokFinal) ? 0 : stokFinal, gambarFinal);
    res.status(201).json({ id: hasil.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal menambah menu", error: error.message });
  }
}

// Ubah menu yang ada.
async function ubahMenu(req, res) {
  try {
    const { id } = req.params;
    const { nama, kategori, harga, stok, gambar_url } = req.body;

    const menuLama = db.prepare("SELECT * FROM menus WHERE id = ?").get(id);
    if (!menuLama) {
      return res.status(404).json({ pesan: "Menu tidak ditemukan" });
    }

    const namaFinal = nama || menuLama.nama;
    const kategoriFinal = kategori || menuLama.kategori;
    const hargaFinal = Number.isNaN(parseInt(harga, 10)) ? menuLama.harga : parseInt(harga, 10);
    const stokFinal = Number.isNaN(parseInt(stok, 10)) ? menuLama.stok : parseInt(stok, 10);
    let gambarFinal = req.file
      ? `/uploads/${req.file.filename}`
      : gambar_url || menuLama.gambar_url;

    if (req.file?.path) {
      try {
        const pipeline = sharp(req.file.path).resize({ width: 800, withoutEnlargement: true });
        const bufferJpg = await pipeline.clone().jpeg({ quality: 80 }).toBuffer();
        fs.writeFileSync(req.file.path, bufferJpg);

        const webpPath = req.file.path.replace(/\.jpg$/i, ".webp");
        const bufferWebp = await pipeline.clone().webp({ quality: 80 }).toBuffer();
        fs.writeFileSync(webpPath, bufferWebp);
      } catch (error) {
        console.error("Gagal memproses gambar menu:", error.message);
      }
    }

    const hasil = db
      .prepare(
        "UPDATE menus SET nama = ?, kategori = ?, harga = ?, stok = ?, gambar_url = ? WHERE id = ?"
      )
      .run(namaFinal, kategoriFinal, hargaFinal, stokFinal, gambarFinal, id);

    res.json({ perubahan: hasil.changes });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengubah menu", error: error.message });
  }
}

// Hapus menu.
function hapusMenu(req, res) {
  try {
    const { id } = req.params;
    const hasil = db.prepare("UPDATE menus SET aktif = 0 WHERE id = ?").run(id);
    res.json({ perubahan: hasil.changes });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal menghapus menu", error: error.message });
  }
}

// Aktifkan kembali menu yang nonaktif.
function aktifkanMenu(req, res) {
  try {
    const { id } = req.params;
    const hasil = db.prepare("UPDATE menus SET aktif = 1 WHERE id = ?").run(id);
    res.json({ perubahan: hasil.changes });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengaktifkan menu", error: error.message });
  }
}

// Ambil stok menu tertentu.
function getStok(req, res) {
  try {
    const { id } = req.params;
    const data = db.prepare("SELECT stok FROM menus WHERE id = ?").get(id);
    if (!data) {
      return res.status(404).json({ pesan: "Menu tidak ditemukan" });
    }
    res.json({ stok: data.stok });
  } catch (error) {
    res.status(500).json({ pesan: "Gagal mengambil stok", error: error.message });
  }
}

module.exports = {
  daftarMenu,
  tambahMenu,
  ubahMenu,
  hapusMenu,
  aktifkanMenu,
  getStok,
};
