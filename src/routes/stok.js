const express = require("express");
const { ubahStok, daftarLogStok } = require("../controllers/stokController");

const router = express.Router();

router.post("/ubah/:id", ubahStok);
router.get("/logs", daftarLogStok);

module.exports = router;
