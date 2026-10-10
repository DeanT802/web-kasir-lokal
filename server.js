const express = require("express");
const path = require("path");
const cors = require("cors");

const { inisialisasiDatabase } = require("./src/db/koneksi");
const apiRouter = require("./src/routes");

const { port } = require("./src/config/app");

const app = express();

// Inisialisasi database saat server pertama kali berjalan.
inisialisasiDatabase();

// Middleware dasar.
app.use(cors());
app.use(express.json());

// Endpoint API utama.
app.use("/api", apiRouter);

// Sajikan frontend statis dari folder public.
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));
app.use("/uploads", express.static(path.join(publicPath, "uploads")));

// Fallback untuk SPA agar tidak full reload.
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Server POS berjalan di http://localhost:${port}`);
});
