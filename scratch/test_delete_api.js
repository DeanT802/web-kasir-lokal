const http = require("http");

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log("=== Testing Delete Preview API ===");
  // Preview all
  const resPreviewAll = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/transactions/preview-delete",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { type: "all" });
  console.log("Preview All:", resPreviewAll.body);

  // Preview date_range single
  const today = new Date().toISOString().slice(0, 10);
  const resPreviewSingle = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/transactions/preview-delete",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { type: "date_range", mode: "single", tanggal: today });
  console.log("Preview Single:", resPreviewSingle.body);

  // Preview date_range range
  const resPreviewRange = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/transactions/preview-delete",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { type: "date_range", mode: "range", tanggal_mulai: "2020-01-01", tanggal_selesai: "2030-12-31" });
  console.log("Preview Range:", resPreviewRange.body);
}

test().catch(console.error);
