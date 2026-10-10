const http = require("http");

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

async function testDelete() {
  console.log("=== Testing Checkout & Delete ===");
  // 1. Create a dummy transaction
  const checkoutRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/checkout",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, {
    items: [{ menu_id: 1, kuantitas: 1 }],
    metode_pembayaran: "qris"
  });

  const createdId = checkoutRes.body.id_transaksi;
  console.log("Created dummy transaction id:", createdId);

  // 2. Test preview for this id
  const previewRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/transactions/preview-delete",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { type: "ids", ids: [createdId] });
  console.log("Preview single created id:", previewRes.body);

  // 3. Delete this id
  const deleteRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/transactions",
    method: "DELETE",
    headers: { "Content-Type": "application/json" }
  }, { type: "ids", ids: [createdId] });
  console.log("Delete result:", deleteRes.body);

  // 4. Verify transaction no longer exists
  const checkRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/transactions/${createdId}`,
    method: "GET"
  });
  console.log("Check deleted status (should be 404):", checkRes.status);
}

testDelete().catch(console.error);
