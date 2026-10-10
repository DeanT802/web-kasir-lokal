const express = require("express");
const { daftarMeja, tambahMeja, ubahMeja, hapusMeja } = require("../controllers/mejaController");

const router = express.Router();

router.get("/", daftarMeja);
router.post("/", tambahMeja);
router.put("/:id", ubahMeja);
router.delete("/:id", hapusMeja);

module.exports = router;
