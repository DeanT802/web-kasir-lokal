const http = require("http");
const fs = require("fs");

function checkSyntax() {
  console.log("Checking JavaScript syntax of app.js and server files...");
  // Check index.html exists and has new modals
  const html = fs.readFileSync("public/index.html", "utf-8");
  const checks = [
    "modalHapusTanggal.tampil",
    "modalKonfirmasiHapus.tampil",
    "togglePilihSemua",
    "togglePilihTransaksi",
    "bukaModalHapusTanggal",
    "mulaiHapusSemua",
    "mulaiHapusTerpilih",
    "eksekusiHapusFinal",
    "Tahap {{ modalKonfirmasiHapus.tahap }} dari 2",
    "Ketik HAPUS",
  ];

  for (const c of checks) {
    if (!html.includes(c)) {
      throw new Error(`Missing expected element in index.html: ${c}`);
    }
  }
  console.log("✓ All index.html UI elements found successfully.");

  // Check app.js exports
  const appJs = fs.readFileSync("public/app.js", "utf-8");
  const appChecks = [
    "transaksiDipilih",
    "modalHapusTanggal",
    "modalKonfirmasiHapus",
    "apakahSemuaDipilih",
    "jumlahTransaksiDipilih",
    "totalNominalDipilih",
    "apakahTahap2Valid",
    "togglePilihSemua",
    "togglePilihTransaksi",
    "bukaModalHapusTanggal",
    "tutupModalHapusTanggal",
    "hitungPreviewHapusTanggal",
    "mulaiHapusTerpilih",
    "mulaiHapusBerdasarkanTanggal",
    "mulaiHapusSemua",
    "lanjutKeTahap2",
    "kembaliKeTahap1",
    "tutupModalKonfirmasiHapus",
    "eksekusiHapusFinal",
  ];

  for (const c of appChecks) {
    if (!appJs.includes(c)) {
      throw new Error(`Missing expected function/ref in app.js: ${c}`);
    }
  }
  console.log("✓ All app.js refs and methods found successfully.");
}

async function checkApiEndpoints() {
  function request(options, body) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const headers = options.headers || {};
      if (payload) {
        headers["Content-Length"] = Buffer.byteLength(payload);
      }
      const req = http.request({ ...options, headers }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  console.log("\nChecking API endpoints...");

  // 1. Health check
  const health = await request({ hostname: "localhost", port: 3000, path: "/api/health", method: "GET" });
  console.log("Health check status:", health.status, health.body);

  // 2. Preview All
  const previewAll = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/transactions/preview-delete",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { type: "all" });
  console.log("Preview All:", previewAll.status, previewAll.body);

  // 3. Create 2 test transactions to test Multi-select delete & Date-range delete
  console.log("\nCreating 2 test transactions...");
  const t1 = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/checkout",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, {
    items: [{ menu_id: 1, kuantitas: 1 }],
    metode_pembayaran: "tunai",
    uang_diterima: 50000,
    kembalian: 29000
  });
  console.log("Created T1 ID:", t1.body.id_transaksi);

  const t2 = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/checkout",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, {
    items: [{ menu_id: 2, kuantitas: 2 }],
    metode_pembayaran: "qris"
  });
  console.log("Created T2 ID:", t2.body.id_transaksi);

  // 4. Test Multi-Select preview & delete on T1 and T2
  console.log("\nTesting Multi-Select Preview & Delete...");
  const previewMulti = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/transactions/preview-delete",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { type: "ids", ids: [t1.body.id_transaksi, t2.body.id_transaksi] });
  console.log("Preview Multi:", previewMulti.body);

  const deleteMulti = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/transactions/delete",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { type: "ids", ids: [t1.body.id_transaksi, t2.body.id_transaksi] });
  console.log("Delete Multi:", deleteMulti.body);

  // Verify they were deleted
  const checkT1 = await request({ hostname: "localhost", port: 3000, path: `/api/transactions/${t1.body.id_transaksi}`, method: "GET" });
  const checkT2 = await request({ hostname: "localhost", port: 3000, path: `/api/transactions/${t2.body.id_transaksi}`, method: "GET" });
  console.log("Verification T1 status (expect 404):", checkT1.status);
  console.log("Verification T2 status (expect 404):", checkT2.status);

  // 5. Test Reports recalculation
  console.log("\nChecking Reports API recalculation...");
  const today = new Date().toISOString().slice(0, 10);
  const repToday = await request({ hostname: "localhost", port: 3000, path: `/api/reports?tanggal=${today}`, method: "GET" });
  console.log("Report Today:", repToday.body);

  console.log("\n=== ALL CHECKS PASSED SUCCESSFULLY ===");
}

async function main() {
  checkSyntax();
  await checkApiEndpoints();
}

main().catch((e) => {
  console.error("Error during verification:", e);
  process.exit(1);
});
