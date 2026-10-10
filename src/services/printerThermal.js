// Implementasi fungsi printer thermal menggunakan escpos + escpos-usb.
// Menyesuaikan kertas 58mm (default ukuran karakter standar).

const escpos = require("escpos");
escpos.USB = require("escpos-usb");

function cetakKarcis(hasilCheckout) {
  try {
    const device = new escpos.USB();
    // Jika ada lebih dari satu atau model spesifik:
    // const device = new escpos.USB(0x04b8, 0x0202); 

    // Opsi printer
    const options = { encoding: "GB18030" /* default */ };
    const printer = new escpos.Printer(device, options);

    device.open(function(error){
      if (error) {
        console.error("Gagal membuka koneksi printer:", error);
        return;
      }

      printer
        .font('a')
        .align('ct')
        .style('b')
        .size(1, 1)
        .text('BASE COFFEE')
        .text('--------------------------------0') // Garis pemisah 58mm
        .align('lt')
        .text(`Waktu : ${new Date(hasilCheckout.tanggal_waktu).toLocaleString('id-ID')}`)
        .text(`Kasir : Admin`)
        .text(`Tx ID : ${hasilCheckout.id_transaksi}`)
        .text(hasilCheckout.meja_nama ? `Meja  : ${hasilCheckout.meja_nama}` : `Meja  : Takeaway`)
        .text('--------------------------------0'); // Garis pemisah

      // Loop item transaksi
      hasilCheckout.items.forEach(item => {
        // Baris 1: Nama item
        printer.text(item.nama);
        
        // Baris 2: Qty x Harga   Subtotal
        // Hitung jarak spasi agar sejajar kanan
        const qty_harga = `${item.kuantitas} x Rp${item.harga.toLocaleString('id-ID')}`;
        const subtotal = `Rp${item.subtotal.toLocaleString('id-ID')}`;
        
        // Ukuran 58mm rata-rata muat 32 karakter
        let spaceLen = 32 - qty_harga.length - subtotal.length;
        if(spaceLen < 1) spaceLen = 1;
        const spaces = ' '.repeat(spaceLen);
        
        printer.text(`${qty_harga}${spaces}${subtotal}`);
      });

      printer.text('--------------------------------0');

      const totalTeks = `Rp${hasilCheckout.total_harga.toLocaleString('id-ID')}`;
      let totalSpaceLen = 32 - "TOTAL".length - totalTeks.length;
      if(totalSpaceLen < 1) totalSpaceLen = 1;
      printer.style('b').text(`TOTAL${' '.repeat(totalSpaceLen)}${totalTeks}`);

      const metodeTeks = hasilCheckout.metode_pembayaran.toUpperCase();
      let bayarSpaceLen = 32 - "BAYAR".length - metodeTeks.length;
      if(bayarSpaceLen < 1) bayarSpaceLen = 1;
      printer.style('normal').text(`BAYAR${' '.repeat(bayarSpaceLen)}${metodeTeks}`);

      printer
        .text('')
        .align('ct')
        .text('Terima kasih')
        .text('Silakan datang kembali')
        .feed(3) // Feed kertas agar potongannya pas
        .cut()
        .close();
    });
  } catch (err) {
    console.error("Kesalahan proses cetak:", err);
  }
}

module.exports = {
  cetakKarcis,
};
