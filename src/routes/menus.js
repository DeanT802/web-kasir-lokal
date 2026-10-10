const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const {
  daftarMenu,
  tambahMenu,
  ubahMenu,
  hapusMenu,
  aktifkanMenu,
  getStok,
} = require("../controllers/menusController");

const router = express.Router();

const folderUpload = path.join(__dirname, "../../public/uploads");
if (!fs.existsSync(folderUpload)) {
  fs.mkdirSync(folderUpload, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, folderUpload),
  filename: (req, file, cb) => {
    const nama = `menu-${Date.now()}.jpg`;
    cb(null, nama);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Format file harus gambar"));
    }
    cb(null, true);
  },
});

function uploadOpsional(req, res, next) {
  if (req.is("multipart/form-data")) {
    return upload.single("gambar")(req, res, next);
  }
  return next();
}

// CRUD Menu.
router.get("/", daftarMenu);
router.post("/", uploadOpsional, tambahMenu);
router.put("/:id", uploadOpsional, ubahMenu);
router.delete("/:id", hapusMenu);
router.post("/:id/restore", aktifkanMenu);

// Endpoint khusus stok.
router.get("/stok/:id", getStok);

// Handler error upload agar pesan lebih ramah.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ pesan: err.message || "Gagal upload gambar" });
  }
  next(err);
});

module.exports = router;
