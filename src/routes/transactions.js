const express = require("express");
const { daftarTransaksi, detailTransaksi } = require("../controllers/transaksiController");

const router = express.Router();

router.get("/", daftarTransaksi);
router.get("/:id", detailTransaksi);

module.exports = router;
