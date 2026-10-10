const express = require("express");
const {
  daftarTransaksi,
  detailTransaksi,
  previewHapusTransaksi,
  hapusTransaksi,
} = require("../controllers/transaksiController");

const router = express.Router();

router.get("/", daftarTransaksi);
router.get("/:id", detailTransaksi);
router.post("/preview-delete", previewHapusTransaksi);
router.post("/delete", hapusTransaksi);
router.delete("/", hapusTransaksi);
router.delete("/:id", hapusTransaksi);

module.exports = router;

