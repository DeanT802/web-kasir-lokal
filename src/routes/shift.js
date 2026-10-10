const express = require("express");
const { shiftAktif, bukaShift, tutupShift } = require("../controllers/shiftController");

const router = express.Router();

router.get("/aktif", shiftAktif);
router.post("/open", bukaShift);
router.post("/close", tutupShift);

module.exports = router;
