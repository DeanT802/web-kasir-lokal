const express = require("express");
const { laporanHarian, laporanItemHarian } = require("../controllers/reportsController");

const router = express.Router();

router.get("/", laporanHarian);
router.get("/items", laporanItemHarian);

module.exports = router;
