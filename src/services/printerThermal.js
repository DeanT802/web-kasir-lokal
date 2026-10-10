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

      const jumlahSalinan = hasilCheckout.mode_cetak === "double" ? 2 : 1;
      for (let s = 1; s <= jumlahSalinan; s++) {
        const labelSalinan = jumlahSalinan === 2
          ? (s === 1 ? "=== LEMBAR KASIR ===" : "=== LEMBAR PELANGGAN ===")
          : "";

        printer
          .font('a')
          .align('ct')
          .style('b')
          .size(1, 1)
          .text('BASE COFFEE');

        if (labelSalinan) {
          printer.style('normal').text(labelSalinan);
        }

        printer
          .text('--------------------------------')
          .align('lt')
          .text(`Waktu : ${new Date(hasilCheckout.tanggal_waktu).toLocaleString('id-ID')}`)
          .text(`Kasir : Admin`)
          .text(`Tx ID : ${hasilCheckout.id_transaksi}`)
          .text(hasilCheckout.meja_nama ? `Meja  : ${hasilCheckout.meja_nama}` : `Meja  : Takeaway`)
          .text('--------------------------------');

        // Loop item transaksi
        hasilCheckout.items.forEach(item => {
          printer.text(item.nama);
          const qty_harga = `${item.kuantitas} x Rp${item.harga.toLocaleString('id-ID')}`;
          const subtotal = `Rp${item.subtotal.toLocaleString('id-ID')}`;
          let spaceLen = 32 - qty_harga.length - subtotal.length;
          if (spaceLen < 1) spaceLen = 1;
          printer.text(`${qty_harga}${' '.repeat(spaceLen)}${subtotal}`);
        });

        printer.text('--------------------------------');

        const totalTeks = `Rp${hasilCheckout.total_harga.toLocaleString('id-ID')}`;
        let totalSpaceLen = 32 - "TOTAL".length - totalTeks.length;
        if (totalSpaceLen < 1) totalSpaceLen = 1;
        printer.style('b').text(`TOTAL${' '.repeat(totalSpaceLen)}${totalTeks}`);

        const metodeTeks = (hasilCheckout.metode_pembayaran || "TUNAI").toUpperCase();
        let bayarSpaceLen = 32 - "METODE".length - metodeTeks.length;
        if (bayarSpaceLen < 1) bayarSpaceLen = 1;
        printer.style('normal').text(`METODE${' '.repeat(bayarSpaceLen)}${metodeTeks}`);

        if (hasilCheckout.metode_pembayaran === 'tunai' && hasilCheckout.uang_diterima) {
          const tunaiTeks = `Rp${Number(hasilCheckout.uang_diterima).toLocaleString('id-ID')}`;
          let tunaiSpace = 32 - "TUNAI".length - tunaiTeks.length;
          if (tunaiSpace < 1) tunaiSpace = 1;
          printer.text(`TUNAI${' '.repeat(tunaiSpace)}${tunaiTeks}`);

          const kembaliTeks = `Rp${Number(hasilCheckout.kembalian || 0).toLocaleString('id-ID')}`;
          let kembaliSpace = 32 - "KEMBALI".length - kembaliTeks.length;
          if (kembaliSpace < 1) kembaliSpace = 1;
          printer.text(`KEMBALI${' '.repeat(kembaliSpace)}${kembaliTeks}`);
        }

        printer
          .text('')
          .align('ct')
          .text('Terima kasih')
          .text('Silakan datang kembali')
          .feed(2);

        if (jumlahSalinan > 1 && s === 1) {
          printer.text('- - - - - - - - - - - - - - - -').feed(1);
        }
      }

      printer.feed(2).cut().close();
    });
  } catch (err) {
    console.error("Kesalahan proses cetak:", err);
  }
}

module.exports = {
  cetakKarcis,
};
