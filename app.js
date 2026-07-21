// ============================================
// Ana liste ekranı — artık Supabase'den gerçek veri okuyor.
// Veri kaynağı: her il için elle toplanıp haftalık CSV olarak
// içeri aktarılan 'fiyatlar' tablosu.
// ============================================

let tumVeri = [];

async function veriYukle() {
  const { data, error } = await supabaseClient
    .from("fiyatlar")
    .select("*")
    .order("tarih", { ascending: false });

  if (error) {
    console.error("Supabase okuma hatası:", error);
    document.getElementById("priceTable").innerHTML =
      `<tr><td colspan="4">Veri yüklenemedi. Konsolu kontrol et.</td></tr>`;
    return [];
  }

  // Her (ürün, il) çifti için en güncel satırı tut
  const enGuncel = new Map();
  data.forEach(satir => {
    const anahtar = satir.urun + "|" + satir.il;
    if (!enGuncel.has(anahtar)) enGuncel.set(anahtar, satir);
  });

  return Array.from(enGuncel.values());
}

function detaySayfasiVarMi(urunAdi) {
  return true;
}

function tabloOlustur(liste) {
  const tablo = document.getElementById("priceTable");

  if (liste.length === 0) {
    tablo.innerHTML = `<tr><td colspan="4">Henüz veri yok. Supabase'e ilk CSV'yi yükledikten sonra burada görünecek.</td></tr>`;
    return;
  }

  tablo.innerHTML = liste.map(veri => `
    <tr data-urun="${veri.urun}">
      <td>${veri.urun}</td>
      <td>${veri.il}</td>
      <td>${veri.min_fiyat}</td>
      <td>${veri.max_fiyat}</td>
    </tr>
  `).join("");

  tablo.querySelectorAll("tr").forEach(satir => {
    satir.addEventListener("click", () => {
      const urunAdi = satir.dataset.urun;
      if (detaySayfasiVarMi(urunAdi)) window.location.href = "urun.html";
    });
  });
}

function sayaclariGuncelle(liste) {
  const urunSayisi = new Set(liste.map(v => v.urun)).size;
  document.getElementById("productCount").innerHTML = urunSayisi;

  const enYeniTarih = liste.reduce((en, v) => (!en || v.tarih > en ? v.tarih : en), null);
  document.getElementById("updateTime").innerHTML = enYeniTarih
    ? new Date(enYeniTarih).toLocaleDateString("tr-TR")
    : "-";
}

async function ekraniYenile() {
  tumVeri = await veriYukle();
  tabloOlustur(tumVeri);
  sayaclariGuncelle(tumVeri);
}

document.getElementById("search").addEventListener("keyup", function () {
  const arama = this.value.toLowerCase();
  const filtre = tumVeri.filter(x =>
    x.urun.toLowerCase().includes(arama) || x.il.toLowerCase().includes(arama)
  );
  tabloOlustur(filtre);
});

// "Verileri Güncelle" — Supabase'e karşı yeniden sorgu atar.
// (Canlı scraping yok; asıl güncelleme sen CSV yükleyince oluyor,
// bu buton sadece ekranı Supabase'deki en son haliyle tazeliyor.)
document.getElementById("updateButton").addEventListener("click", ekraniYenile);

ekraniYenile();
