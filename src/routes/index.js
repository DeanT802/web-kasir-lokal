const express = require("express");
const menuRoutes = require("./menus");
const checkoutRoutes = require("./checkout");
const reportsRoutes = require("./reports");
const mejaRoutes = require("./meja");
const stokRoutes = require("./stok");
const shiftRoutes = require("./shift");
const transaksiRoutes = require("./transactions");

const router = express.Router();

// Endpoint kesehatan server.
router.get("/health", (req, res) => {
  res.json({ status: "ok", waktu: new Date().toISOString() });
});

router.use("/menus", menuRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/reports", reportsRoutes);
router.use("/meja", mejaRoutes);
router.use("/stok", stokRoutes);
router.use("/shift", shiftRoutes);
router.use("/transactions", transaksiRoutes);

module.exports = router;
