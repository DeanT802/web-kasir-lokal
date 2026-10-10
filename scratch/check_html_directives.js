const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');

// Match attributes like v-if="...", :class="...", @click="..."
const attrRegex = /(v-[\w.-]+|:[a-zA-Z0-9_-]+|@[a-zA-Z0-9_-]+)="([^"]*)"/g;
let match;
let count = 0;
let errors = 0;

while ((match = attrRegex.exec(html)) !== null) {
  const [full, attr, value] = match;
  count++;
  if (!value.trim()) continue;

  // If it's a v-for directive, skip special syntax "item in list"
  if (attr === 'v-for') {
    if (!value.includes(' in ') && !value.includes(' of ')) {
      console.log('Suspicious v-for:', value);
      errors++;
    }
    continue;
  }

  // Test if it parses as valid JS expression or statement
  try {
    new Function('formatRupiah', 'strukAktif', 'modeCetak', 'ringkasanHariIni', 'daftarMenu', 'keranjang', 'totalHarga', 'modalStruk', 'modalHapusTanggal', 'modalKonfirmasiHapus', 'transaksiList', 'transaksiDetail', 'jumlahTransaksiDipilih', 'totalNominalDipilih', 'apakahSemuaDipilih', 'apakahTahap2Valid', 'return (' + value + ')');
  } catch (e1) {
    try {
      new Function('formatRupiah', 'strukAktif', 'modeCetak', 'ringkasanHariIni', 'daftarMenu', 'keranjang', 'totalHarga', 'modalStruk', 'modalHapusTanggal', 'modalKonfirmasiHapus', 'transaksiList', 'transaksiDetail', 'jumlahTransaksiDipilih', 'totalNominalDipilih', 'apakahSemuaDipilih', 'apakahTahap2Valid', value);
    } catch (e2) {
      console.log('Error in attribute:', attr, '=', `"${value}"`, '->', e2.message);
      errors++;
    }
  }
}

console.log(`Checked ${count} attributes. Found ${errors} syntax errors.`);
