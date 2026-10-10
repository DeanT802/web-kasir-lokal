import { createApp, ref, computed, onMounted, watch } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

createApp({
  setup() {
    const daftarMenu = ref([]);
    const kategoriAktif = ref("semua");
    const halamanAktif = ref("kasir");
    const keranjang = ref([]);
    const toast = ref({ tampil: false, pesan: "" });
    const sedangMemproses = ref(false);
  const kataKunciMenu = ref("");
  const filterStokRendah = ref(false);
  const urutkanMenu = ref("nama");
    const metodePembayaran = ref("tunai");
    const daftarMeja = ref([]);
    const mejaDipilih = ref(null);
    const transaksiList = ref([]);
    const transaksiDetail = ref(null);
  const tanggalFilterTransaksi = ref("");
    const stokLogs = ref([]);
    const perubahanStok = ref({});
    const catatanStok = ref({});
    const namaMejaBaru = ref("");
    const shiftAktif = ref(null);
    const saldoAwal = ref(0);
    const saldoAkhir = ref(0);
    const catatanShift = ref("");
    const rekapHarian = ref([]);
  const rekapItemHarian = ref([]);
  const tanggalRekapItem = ref("");
  const ringkasanHariIni = ref({ pemasukan: 0, total_transaksi: 0, total_item: 0 });
    const menuBaru = ref({
      nama: "",
      kategori: "kopi",
      harga: "",
      stok: "",
      gambar_url: "",
      file: null,
      preview: "",
      progress: 0,
      loading: false,
    });
    const menuEdit = ref(null);
    const modalKonfirmasi = ref({ tampil: false, pesan: "", aksi: null });
    const dukungWebp = ref(false);
  const tampilkanNonaktif = ref(false);

    const daftarKategori = computed(() => ["semua", "kopi", "non-kopi", "snack"]);
  const daftarMetode = computed(() => ["tunai", "qris", "debit"]);

    const menuTersaring = computed(() => {
      const kataKunci = kataKunciMenu.value.trim().toLowerCase();
      const hasil = daftarMenu.value.filter((menu) => {
        const cocokKategori =
          kategoriAktif.value === "semua" || menu.kategori === kategoriAktif.value;
        const cocokNama = !kataKunci || menu.nama.toLowerCase().includes(kataKunci);
        const cocokStok = !filterStokRendah.value || menu.stok <= 5;
        return cocokKategori && cocokNama && cocokStok;
      });
      const daftar = [...hasil];

      if (urutkanMenu.value === "harga") {
        daftar.sort((a, b) => b.harga - a.harga);
      } else if (urutkanMenu.value === "stok") {
        daftar.sort((a, b) => a.stok - b.stok);
      } else {
        daftar.sort((a, b) => a.nama.localeCompare(b.nama));
      }

      return daftar;
    });

    const maxPemasukan = computed(() =>
      rekapHarian.value.reduce(
        (maksimal, item) => Math.max(maksimal, item.pemasukan || 0),
        0
      )
    );

    function persenPemasukan(pemasukan) {
      if (!maxPemasukan.value) {
        return 0;
      }
      return Math.round((pemasukan / maxPemasukan.value) * 100);
    }

    function tanggalHariIni() {
      return new Date().toISOString().slice(0, 10);
    }

    const totalHarga = computed(() =>
      keranjang.value.reduce((total, item) => total + item.subtotal, 0)
    );

    // === FITUR 1: MODE CETAK STRUK (Single vs Double) ===
    const modeCetak = ref(localStorage.getItem("pos_mode_cetak") || "single");
    const modalStruk = ref({ tampil: false, data: null });
    const strukAktif = ref(null);

    watch(modeCetak, (modeBaru) => {
      localStorage.setItem("pos_mode_cetak", modeBaru);
    });

    function setModeCetak(mode) {
      modeCetak.value = mode;
      localStorage.setItem("pos_mode_cetak", mode);
      tampilkanToast(
        mode === "double"
          ? "Mode Cetak: Double (Lembar Kasir & Pelanggan)"
          : "Mode Cetak: Single (1 Lembar Struk)"
      );
    }

    function cetakStruk(dataTrans = null) {
      const data = dataTrans || modalStruk.value.data || strukAktif.value;
      if (!data) {
        tampilkanToast("Tidak ada data struk yang dapat dicetak");
        return;
      }
      strukAktif.value = data;
      setTimeout(() => {
        window.print();
      }, 150);
    }

    function tutupModalStruk() {
      modalStruk.value = { tampil: false, data: null };
    }

    function cetakStrukRiwayat(trxDetail) {
      if (!trxDetail || !trxDetail.transaksi) return;
      const dataStruk = {
        id_transaksi: trxDetail.transaksi.id,
        tanggal_waktu: trxDetail.transaksi.tanggal_waktu,
        total_harga: trxDetail.transaksi.total_harga,
        metode_pembayaran: trxDetail.transaksi.metode_pembayaran,
        uang_diterima: trxDetail.transaksi.uang_diterima || trxDetail.transaksi.total_harga,
        kembalian: trxDetail.transaksi.kembalian || 0,
        mode_cetak: trxDetail.transaksi.mode_cetak || modeCetak.value,
        items: trxDetail.items || [],
        meja_nama: trxDetail.transaksi.meja_nama,
      };
      cetakStruk(dataStruk);
    }

    // === FITUR 2: TOMBOL UANG PECAHAN & INPUT TUNAI ===
    const uangDiterima = ref(0);
    const uangDiterimaInput = ref("");
    const modeInputPecahan = ref("set"); // 'set' = ganti nominal, 'tambah' = akumulasi (+)

    const pecahanRupiah = [
      { nilai: 1000, label: "Rp 1.000" },
      { nilai: 2000, label: "Rp 2.000" },
      { nilai: 5000, label: "Rp 5.000" },
      { nilai: 10000, label: "Rp 10.000" },
      { nilai: 20000, label: "Rp 20.000" },
      { nilai: 50000, label: "Rp 50.000" },
      { nilai: 100000, label: "Rp 100.000" },
    ];

    function formatNominalAngka(angka) {
      if (!angka && angka !== 0) return "";
      return new Intl.NumberFormat("id-ID").format(angka);
    }

    function klikPecahan(nominal) {
      if (modeInputPecahan.value === "tambah") {
        uangDiterima.value = (Number(uangDiterima.value) || 0) + nominal;
      } else {
        uangDiterima.value = nominal;
      }
      uangDiterimaInput.value = formatNominalAngka(uangDiterima.value);
    }

    function setUangPas() {
      if (totalHarga.value <= 0) return;
      uangDiterima.value = totalHarga.value;
      uangDiterimaInput.value = formatNominalAngka(uangDiterima.value);
    }

    function resetUangDiterima() {
      uangDiterima.value = 0;
      uangDiterimaInput.value = "";
    }

    function onInputUangDiterima(event) {
      const raw = event.target.value.replace(/[^0-9]/g, "");
      const angka = raw ? parseInt(raw, 10) : 0;
      uangDiterima.value = angka;
      uangDiterimaInput.value = angka > 0 ? formatNominalAngka(angka) : "";
    }

    // === FITUR 3: KALKULASI KEMBALIAN OTOMATIS & VALIDASI PEMBAYARAN ===
    const kembalian = computed(() => {
      if (metodePembayaran.value !== "tunai") return 0;
      const bayar = Number(uangDiterima.value) || 0;
      return Math.max(0, bayar - totalHarga.value);
    });

    const kurangBayar = computed(() => {
      if (metodePembayaran.value !== "tunai") return 0;
      const bayar = Number(uangDiterima.value) || 0;
      return Math.max(0, totalHarga.value - bayar);
    });

    const apakahUangCukup = computed(() => {
      if (keranjang.value.length === 0 || totalHarga.value <= 0) return false;
      if (metodePembayaran.value === "tunai") {
        return (Number(uangDiterima.value) || 0) >= totalHarga.value;
      }
      return true;
    });

    watch(metodePembayaran, (baru) => {
      if (baru !== "tunai" && totalHarga.value > 0) {
        uangDiterima.value = totalHarga.value;
        uangDiterimaInput.value = formatNominalAngka(totalHarga.value);
      }
    });

    function tampilkanToast(pesan) {
      // Notifikasi cepat untuk operator kasir.
      toast.value = { tampil: true, pesan };
      setTimeout(() => {
        toast.value = { tampil: false, pesan: "" };
      }, 2500);
    }

    function formatRupiah(angka) {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(angka);
    }

    function ambilMenu() {
      // Ambil daftar menu terbaru dari backend.
      const query =
        halamanAktif.value === "menu-baru" && tampilkanNonaktif.value
          ? "?semua=1"
          : "";
      fetch(`/api/menus${query}`)
        .then((res) => res.json())
        .then((data) => {
          daftarMenu.value = data;
        })
        .catch(() => tampilkanToast("Gagal mengambil menu"));
    }

    function ambilMeja() {
      fetch("/api/meja")
        .then((res) => res.json())
        .then((data) => {
          daftarMeja.value = data.filter((item) => item.aktif === 1);
        })
        .catch(() => tampilkanToast("Gagal mengambil meja"));
    }

    async function tambahMejaBaru() {
      if (!namaMejaBaru.value.trim()) {
        tampilkanToast("Nama meja wajib diisi");
        return;
      }

      const response = await fetch("/api/meja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: namaMejaBaru.value }),
      });

      if (!response.ok) {
        const error = await response.json();
        tampilkanToast(error.pesan || "Gagal menambah meja");
        return;
      }

      namaMejaBaru.value = "";
      ambilMeja();
    }

    async function hapusMeja(id) {
      const response = await fetch(`/api/meja/${id}`, { method: "DELETE" });
      if (!response.ok) {
        tampilkanToast("Gagal menghapus meja");
        return;
      }
      ambilMeja();
    }

    function tambahKeKeranjang(menu) {
      // Validasi stok sebelum menambah item ke keranjang.
      const item = keranjang.value.find((data) => data.menu_id === menu.id);
      const kuantitasSekarang = item ? item.kuantitas : 0;

      if (menu.stok <= kuantitasSekarang) {
        tampilkanToast("Stok tidak mencukupi");
        return;
      }

      if (item) {
        item.kuantitas += 1;
        item.subtotal = item.kuantitas * item.harga;
      } else {
        keranjang.value.push({
          menu_id: menu.id,
          nama: menu.nama,
          harga: menu.harga,
          kuantitas: 1,
          subtotal: menu.harga,
        });
      }
    }

    // Tambah item menggunakan ID agar stok tetap tervalidasi.
    function tambahKeKeranjangDenganId(menuId) {
      const menu = daftarMenu.value.find((data) => data.id === menuId);
      if (!menu) {
        tampilkanToast("Menu tidak ditemukan");
        return;
      }
      tambahKeKeranjang(menu);
    }

    function kurangiItem(item) {
      item.kuantitas -= 1;
      item.subtotal = item.kuantitas * item.harga;

      if (item.kuantitas <= 0) {
        keranjang.value = keranjang.value.filter(
          (data) => data.menu_id !== item.menu_id
        );
      }
    }

    function bersihkanKeranjang() {
      keranjang.value = [];
      resetUangDiterima();
    }

    async function prosesCheckout() {
      if (keranjang.value.length === 0) {
        tampilkanToast("Keranjang masih kosong");
        return;
      }

      if (metodePembayaran.value === "tunai" && !apakahUangCukup.value) {
        tampilkanToast(`Uang diterima belum cukup. Kurang ${formatRupiah(kurangBayar.value)}`);
        return;
      }

      sedangMemproses.value = true;
      try {
        const nominalBayar = metodePembayaran.value === "tunai"
          ? (Number(uangDiterima.value) || totalHarga.value)
          : totalHarga.value;
        const nominalKembalian = metodePembayaran.value === "tunai"
          ? kembalian.value
          : 0;

        const payload = {
          items: keranjang.value.map((item) => ({
            menu_id: item.menu_id,
            kuantitas: item.kuantitas,
          })),
          metode_pembayaran: metodePembayaran.value,
          meja_id: mejaDipilih.value,
          uang_diterima: nominalBayar,
          kembalian: nominalKembalian,
          mode_cetak: modeCetak.value,
        };

        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.pesan || "Checkout gagal");
        }

        const hasil = await response.json();
        tampilkanToast("Transaksi berhasil! Struk siap dicetak.");

        // Simpan data struk dan tampilkan modal preview struk
        strukAktif.value = hasil;
        modalStruk.value = {
          tampil: true,
          data: hasil,
        };

        bersihkanKeranjang();
        transaksiDetail.value = null;
        ambilMenu();
        ambilTransaksi();
        ambilRingkasanHariIni();
      } catch (error) {
        tampilkanToast(error.message);
      } finally {
        sedangMemproses.value = false;
      }
    }

    function ambilTransaksi() {
      const query = tanggalFilterTransaksi.value
        ? `?tanggal=${tanggalFilterTransaksi.value}`
        : "";
      fetch(`/api/transactions${query}`)
        .then((res) => res.json())
        .then((data) => {
          transaksiList.value = data;
        })
        .catch(() => tampilkanToast("Gagal mengambil transaksi"));
    }

    function resetFilterTransaksi() {
      tanggalFilterTransaksi.value = "";
      ambilTransaksi();
    }

    function filterTransaksiHariIni() {
      tanggalFilterTransaksi.value = tanggalHariIni();
      ambilTransaksi();
    }

    function lihatDetailTransaksi(id) {
      fetch(`/api/transactions/${id}`)
        .then((res) => res.json())
        .then((data) => {
          transaksiDetail.value = data;
        })
        .catch(() => tampilkanToast("Gagal mengambil detail transaksi"));
    }

    function ambilLogStok() {
      fetch("/api/stok/logs")
        .then((res) => res.json())
        .then((data) => {
          stokLogs.value = data;
        })
        .catch(() => tampilkanToast("Gagal mengambil log stok"));
    }

    async function ubahStokMenu(menuId) {
      const perubahan = parseInt(perubahanStok.value[menuId] || 0, 10);
      if (!Number.isInteger(perubahan) || perubahan === 0) {
        tampilkanToast("Isi perubahan stok (angka) terlebih dulu");
        return;
      }

      const response = await fetch(`/api/stok/ubah/${menuId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perubahan,
          catatan: catatanStok.value[menuId] || "",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        tampilkanToast(error.pesan || "Gagal mengubah stok");
        return;
      }

      perubahanStok.value[menuId] = "";
      catatanStok.value[menuId] = "";
      ambilMenu();
      ambilLogStok();
    }

    function ambilShiftAktif() {
      fetch("/api/shift/aktif")
        .then((res) => res.json())
        .then((data) => {
          shiftAktif.value = data;
        })
        .catch(() => tampilkanToast("Gagal mengambil shift"));
    }

    async function bukaShift() {
      const response = await fetch("/api/shift/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldo_awal: saldoAwal.value, catatan: catatanShift.value }),
      });

      if (!response.ok) {
        const error = await response.json();
        tampilkanToast(error.pesan || "Gagal membuka shift");
        return;
      }

      saldoAwal.value = 0;
      catatanShift.value = "";
      ambilShiftAktif();
    }

    async function tutupShift() {
      const response = await fetch("/api/shift/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldo_akhir: saldoAkhir.value, catatan: catatanShift.value }),
      });

      if (!response.ok) {
        const error = await response.json();
        tampilkanToast(error.pesan || "Gagal menutup shift");
        return;
      }

      saldoAkhir.value = 0;
      catatanShift.value = "";
      ambilShiftAktif();
      ambilRekapHarian();
    }

    function ambilRekapHarian() {
      fetch("/api/reports")
        .then((res) => res.json())
        .then((data) => {
          rekapHarian.value = data.laporan || [];
        })
        .catch(() => tampilkanToast("Gagal mengambil rekap harian"));
    }

    function ambilRingkasanHariIni() {
      const tanggal = tanggalHariIni();
      fetch(`/api/reports?tanggal=${tanggal}`)
        .then((res) => res.json())
        .then((data) => {
          ringkasanHariIni.value = {
            pemasukan: data.pemasukan ?? 0,
            total_transaksi: data.total_transaksi ?? 0,
            total_item: data.total_item ?? 0,
          };
        })
        .catch(() => tampilkanToast("Gagal mengambil ringkasan hari ini"));
    }

    function ambilRekapItemHarian(tanggal = "") {
      const query = tanggal ? `?tanggal=${tanggal}` : "";
      fetch(`/api/reports/items${query}`)
        .then((res) => res.json())
        .then((data) => {
          rekapItemHarian.value = data.items || [];
        })
        .catch(() => tampilkanToast("Gagal mengambil rekap item"));
    }

    function filterRekapItemHariIni() {
      tanggalRekapItem.value = tanggalHariIni();
      ambilRekapItemHarian(tanggalRekapItem.value);
    }

    function resetRekapItem() {
      tanggalRekapItem.value = "";
      ambilRekapItemHarian();
    }

    function unduhCsvRekap() {
      if (rekapHarian.value.length === 0) {
        tampilkanToast("Belum ada data rekap");
        return;
      }

      const header = ["tanggal", "pemasukan", "total_transaksi", "total_item"];
      const rows = rekapHarian.value.map((item) => [
        item.tanggal,
        item.pemasukan,
        item.total_transaksi,
        item.total_item,
      ]);
      const csv = [header, ...rows].map((baris) => baris.join(",")).join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rekap-harian-${tanggalHariIni()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }

    function pilihFotoMenu(event) {
      const file = event.target.files?.[0];
      if (!file) {
        menuBaru.value.file = null;
        menuBaru.value.preview = "";
        return;
      }

      if (!file.type.startsWith("image/")) {
        tampilkanToast("Format foto harus gambar");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        tampilkanToast("Ukuran foto maksimal 2MB");
        return;
      }

      kompresGambar(file)
        .then((hasil) => {
          menuBaru.value.file = hasil.file;
          menuBaru.value.preview = hasil.preview;
        })
        .catch((error) => tampilkanToast(error.message));
    }

    function pilihMenuEdit(menu) {
      menuEdit.value = {
        id: menu.id,
        nama: menu.nama,
        kategori: menu.kategori,
        harga: menu.harga,
        stok: menu.stok,
        gambar_url: menu.gambar_url || "",
        file: null,
        preview: menu.gambar_url || "",
        progress: 0,
        loading: false,
      };
    }

    function pilihFotoEdit(event) {
      const file = event.target.files?.[0];
      if (!menuEdit.value) {
        return;
      }
      if (!file) {
        menuEdit.value.file = null;
        menuEdit.value.preview = menuEdit.value.gambar_url || "";
        return;
      }

      if (!file.type.startsWith("image/")) {
        tampilkanToast("Format foto harus gambar");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        tampilkanToast("Ukuran foto maksimal 2MB");
        return;
      }

      kompresGambar(file)
        .then((hasil) => {
          menuEdit.value.file = hasil.file;
          menuEdit.value.preview = hasil.preview;
        })
        .catch((error) => tampilkanToast(error.message));
    }

    async function kompresGambar(file) {
      const gambar = await createImageBitmap(file);
      const maxLebar = 800;
      const skala = gambar.width > maxLebar ? maxLebar / gambar.width : 1;
      const lebar = Math.round(gambar.width * skala);
      const tinggi = Math.round(gambar.height * skala);

      const canvas = document.createElement("canvas");
      canvas.width = lebar;
      canvas.height = tinggi;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(gambar, 0, 0, lebar, tinggi);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.8)
      );

      if (!blob) {
        throw new Error("Gagal memproses gambar");
      }

      const fileHasil = new File([blob], `menu-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      return {
        file: fileHasil,
        preview: URL.createObjectURL(blob),
      };
    }

    function uploadFormData(url, formData, onProgress, method = "POST") {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const persen = Math.round((event.loaded / event.total) * 100);
            onProgress(persen);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText || "{}"));
          } else {
            try {
              const error = JSON.parse(xhr.responseText || "{}");
              reject(new Error(error.pesan || "Upload gagal"));
            } catch {
              reject(new Error("Upload gagal"));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Upload gagal"));
        xhr.send(formData);
      });
    }

    function gambarWebp(menu) {
      if (!menu?.gambar_webp || !dukungWebp.value) return "";
      return `${menu.gambar_webp}?v=${menu.id}`;
    }

    function gambarMenu(menu) {
      if (!menu?.gambar_url) {
        return "";
      }
      return `${menu.gambar_url}?v=${menu.id}`;
    }

    function cekWebp() {
      try {
        const canvas = document.createElement("canvas");
        dukungWebp.value =
          canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
      } catch {
        dukungWebp.value = false;
      }
    }

    async function simpanMenuEdit() {
      if (!menuEdit.value) {
        tampilkanToast("Pilih menu yang akan diedit");
        return;
      }

      if (!menuEdit.value.nama || !menuEdit.value.harga) {
        tampilkanToast("Nama dan harga wajib diisi");
        return;
      }

      try {
        menuEdit.value.loading = true;
        let response;
        if (menuEdit.value.file) {
          const formData = new FormData();
          formData.append("nama", menuEdit.value.nama);
          formData.append("kategori", menuEdit.value.kategori);
          formData.append("harga", menuEdit.value.harga);
          formData.append("stok", menuEdit.value.stok || 0);
          formData.append("gambar", menuEdit.value.file);

          menuEdit.value.progress = 0;
          await uploadFormData(
            `/api/menus/${menuEdit.value.id}`,
            formData,
            (persen) => {
              menuEdit.value.progress = persen;
            },
            "PUT"
          );
          response = { ok: true };
        } else {
          response = await fetch(`/api/menus/${menuEdit.value.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nama: menuEdit.value.nama,
              kategori: menuEdit.value.kategori,
              harga: menuEdit.value.harga,
              stok: menuEdit.value.stok || 0,
              gambar_url: menuEdit.value.gambar_url || null,
            }),
          });
        }

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.pesan || "Gagal mengubah menu");
        }

        tampilkanToast("Menu berhasil diperbarui");
        menuEdit.value = null;
        ambilMenu();
      } catch (error) {
        tampilkanToast(error.message);
      } finally {
        if (menuEdit.value) {
          menuEdit.value.loading = false;
        }
      }
    }

    async function hapusMenu(id) {
      modalKonfirmasi.value = {
        tampil: true,
        pesan: "Yakin ingin menghapus menu ini?",
        aksi: async () => {
          const response = await fetch(`/api/menus/${id}`, { method: "DELETE" });
          if (!response.ok) {
            const error = await response.json();
            tampilkanToast(error.pesan || "Gagal menghapus menu");
            return;
          }
          tampilkanToast("Menu dihapus");
          ambilMenu();
        },
      };
    }

    async function aktifkanMenu(id) {
      const response = await fetch(`/api/menus/${id}/restore`, { method: "POST" });
      if (!response.ok) {
        const error = await response.json();
        tampilkanToast(error.pesan || "Gagal mengaktifkan menu");
        return;
      }
      tampilkanToast("Menu diaktifkan");
      ambilMenu();
    }

    async function jalankanKonfirmasi() {
      if (modalKonfirmasi.value.aksi) {
        await modalKonfirmasi.value.aksi();
      }
      modalKonfirmasi.value = { tampil: false, pesan: "", aksi: null };
    }

    function tutupKonfirmasi() {
      modalKonfirmasi.value = { tampil: false, pesan: "", aksi: null };
    }

    async function simpanMenuBaru() {
      if (!menuBaru.value.nama || !menuBaru.value.harga) {
        tampilkanToast("Nama dan harga wajib diisi");
        return;
      }

      try {
        menuBaru.value.loading = true;
        let response;
        if (menuBaru.value.file) {
          const formData = new FormData();
          formData.append("nama", menuBaru.value.nama);
          formData.append("kategori", menuBaru.value.kategori);
          formData.append("harga", menuBaru.value.harga);
          formData.append("stok", menuBaru.value.stok || 0);
          formData.append("gambar", menuBaru.value.file);

          menuBaru.value.progress = 0;
          await uploadFormData("/api/menus", formData, (persen) => {
            menuBaru.value.progress = persen;
          });
          response = { ok: true };
        } else {
          response = await fetch("/api/menus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nama: menuBaru.value.nama,
              kategori: menuBaru.value.kategori,
              harga: menuBaru.value.harga,
              stok: menuBaru.value.stok || 0,
              gambar_url: menuBaru.value.gambar_url || null,
            }),
          });
        }

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.pesan || "Gagal menambah menu");
        }

        tampilkanToast("Menu berhasil ditambahkan");
        menuBaru.value = {
          nama: "",
          kategori: "kopi",
          harga: "",
          stok: "",
          gambar_url: "",
          file: null,
          preview: "",
          progress: 0,
          loading: false,
        };
        ambilMenu();
      } catch (error) {
        tampilkanToast(error.message);
      } finally {
        menuBaru.value.loading = false;
      }
    }

    onMounted(() => {
      cekWebp();
      ambilMenu();
      ambilMeja();
      ambilTransaksi();
      ambilLogStok();
      ambilShiftAktif();
      ambilRekapHarian();
      ambilRekapItemHarian();
      ambilRingkasanHariIni();
    });

    watch(halamanAktif, () => {
      ambilMenu();
    });

    watch(tampilkanNonaktif, () => {
      if (halamanAktif.value === "menu-baru") {
        ambilMenu();
      }
    });

  return {
    daftarMenu,
    kategoriAktif,
    halamanAktif,
    daftarKategori,
    daftarMetode,
    kataKunciMenu,
    filterStokRendah,
    urutkanMenu,
    menuTersaring,
    keranjang,
    totalHarga,
    toast,
    sedangMemproses,
    metodePembayaran,
    daftarMeja,
    mejaDipilih,
    transaksiList,
    transaksiDetail,
    tanggalFilterTransaksi,
    stokLogs,
    perubahanStok,
    catatanStok,
    namaMejaBaru,
    shiftAktif,
    saldoAwal,
    saldoAkhir,
    catatanShift,
    rekapHarian,
    rekapItemHarian,
    tanggalRekapItem,
    ringkasanHariIni,
    menuBaru,
    menuEdit,
    modalKonfirmasi,
    dukungWebp,
    tampilkanNonaktif,
    formatRupiah,
    tambahKeKeranjang,
    tambahKeKeranjangDenganId,
    kurangiItem,
    bersihkanKeranjang,
    prosesCheckout,
    ambilTransaksi,
    filterTransaksiHariIni,
    resetFilterTransaksi,
    lihatDetailTransaksi,
    ambilLogStok,
    ubahStokMenu,
    tambahMejaBaru,
    hapusMeja,
    bukaShift,
    tutupShift,
    ambilRekapItemHarian,
    filterRekapItemHariIni,
    resetRekapItem,
    persenPemasukan,
    unduhCsvRekap,
    ambilRingkasanHariIni,
    pilihFotoMenu,
    simpanMenuBaru,
    pilihMenuEdit,
    pilihFotoEdit,
    simpanMenuEdit,
    hapusMenu,
    aktifkanMenu,
    jalankanKonfirmasi,
    tutupKonfirmasi,
    kompresGambar,
    uploadFormData,
    gambarWebp,
    gambarMenu,
    // Ekspor Fitur POS Baru
    modeCetak,
    setModeCetak,
    modalStruk,
    strukAktif,
    cetakStruk,
    tutupModalStruk,
    cetakStrukRiwayat,
    uangDiterima,
    uangDiterimaInput,
    modeInputPecahan,
    pecahanRupiah,
    formatNominalAngka,
    klikPecahan,
    setUangPas,
    resetUangDiterima,
    onInputUangDiterima,
    kembalian,
    kurangBayar,
    apakahUangCukup,
  };
  },
}).mount("#app");
