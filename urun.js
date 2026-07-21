// ============================================
// SABİTLER — il renkleri hiç değişmeyecek
// ============================================
const ILLER = [
  { id: "antalya",  ad: "Antalya",  renk: "#16a34a" },
  { id: "istanbul", ad: "İstanbul", renk: "#2563eb" },
  { id: "bursa",    ad: "Bursa",    renk: "#eab308" },
  { id: "izmir",    ad: "İzmir",    renk: "#9333ea" },
  { id: "mersin",   ad: "Mersin",   renk: "#dc2626" },
  { id: "adana",    ad: "Adana",    renk: "#374151" },
];

// Görünürlük durumu (hepsi başlangıçta açık)
const gorunurluk = {};
ILLER.forEach(il => gorunurluk[il.id] = true);

let aktifAralik = "hafta";   // hafta | ay | yil
let aktifTip = "cizgi";      // cizgi | geometrik | nokta | kolon
let chart = null;

// ============================================
// VERİ KATMANI — Supabase'den gerçek veri.
// Veri haftalık ve elle toplandığı için düzenli aralıklarla
// gelmiyor; bu yüzden X ekseni sabit "Pzt,Sal,..." değil,
// veride gerçekten bulunan tarihlerden oluşuyor.
// ============================================
async function veriGetir(urunAdi, aralik) {
  const gunSayisi = { hafta: 7, ay: 30, yil: 365 }[aralik];
  const baslangic = new Date(Date.now() - gunSayisi * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  const { data, error } = await supabaseClient
    .from("fiyatlar")
    .select("il, tarih, min_fiyat, max_fiyat")
    .eq("urun", urunAdi)
    .gte("tarih", baslangic)
    .order("tarih", { ascending: true });

  if (error) {
    console.error("Supabase okuma hatası:", error);
    return { tarihler: [], seriler: {} };
  }

  // Veride gerçekten var olan tarihleri sırayla topla
  const tarihler = [...new Set(data.map(r => r.tarih))].sort();

  // Her il için, tarihler dizisiyle hizalanmış bir ortalama fiyat serisi kur.
  // O ilde o tarihte veri yoksa null bırak — Chart.js boşluğu kırık çizgi olarak gösterir.
  const seriler = {};
  ILLER.forEach(il => {
    seriler[il.id] = tarihler.map(t => {
      const satir = data.find(r => r.il === il.ad && r.tarih === t);
      return satir ? +((satir.min_fiyat + satir.max_fiyat) / 2).toFixed(2) : null;
    });
  });

  return { tarihler, seriler };
}

function etiketUret(tarihler) {
  return tarihler.map(t => new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }));
}

// ============================================
// GRAFİK TİPİNE GÖRE CHART.JS AYARLARI
// 4 modu tek chart motoruyla çözüyoruz:
// - cizgi: düz çizgi
// - geometrik: yüksek tension'lı yumuşatılmış çizgi + hafif dolgu
// - nokta: sadece nokta, çizgi yok (scatter görünümü)
// - kolon: bar chart
// ============================================
function datasetAyarlari(tip) {
  switch (tip) {
    case "cizgi":
      return { type: "line", tension: 0, pointRadius: 2, borderWidth: 2, fill: false, showLine: true };
    case "geometrik":
      return { type: "line", tension: 0.5, pointRadius: 0, borderWidth: 2.5, fill: true, showLine: true };
    case "nokta":
      return { type: "line", tension: 0, pointRadius: 4, borderWidth: 0, fill: false, showLine: false };
    case "kolon":
      return { type: "bar" };
    default:
      return { type: "line" };
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

async function grafigiCiz() {
  const { tarihler, seriler } = await veriGetir("Domates", aktifAralik);

  if (tarihler.length === 0) {
    document.getElementById("fiyatGrafik").parentElement.innerHTML =
      `<p style="text-align:center;color:#777;padding-top:140px">
        Bu aralıkta henüz veri yok. Supabase'e CSV yüklendikçe burası dolacak.
      </p>`;
    return;
  }

  const etiketler = etiketUret(tarihler);
  const ayar = datasetAyarlari(aktifTip);

  const datasets = ILLER
    .filter(il => gorunurluk[il.id])
    .map(il => ({
      label: il.ad,
      data: seriler[il.id],
      borderColor: il.renk,
      backgroundColor: aktifTip === "geometrik" ? hexToRgba(il.renk, 0.12) : il.renk,
      spanGaps: false,
      ...ayar,
    }));

  const config = {
    type: aktifTip === "kolon" ? "bar" : "line",
    data: { labels: etiketler, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => v + " ₺" } }
      }
    }
  };

  if (chart) chart.destroy();
  chart = new Chart(document.getElementById("fiyatGrafik"), config);
}

// ============================================
// İL LİSTESİ (göz ikonu ile aç/kapat)
// ============================================
function ilListesiOlustur() {
  const kutu = document.getElementById("ilListesi");
  kutu.innerHTML = "";
  ILLER.forEach(il => {
    const satir = document.createElement("div");
    satir.className = "il-satir" + (gorunurluk[il.id] ? "" : " gizli");
    satir.innerHTML = `
      <span class="goz">${gorunurluk[il.id] ? "👁" : "🚫"}</span>
      <span>${il.ad}</span>
      <span class="renk-nokta" style="background:${il.renk}"></span>
    `;
    satir.addEventListener("click", () => {
      gorunurluk[il.id] = !gorunurluk[il.id];
      ilListesiOlustur();
      grafigiCiz();
    });
    kutu.appendChild(satir);
  });
}

// ============================================
// KONTROLLER
// ============================================
document.getElementById("zamanSecim").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;
  document.querySelectorAll("#zamanSecim button").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  aktifAralik = e.target.dataset.aralik;
  grafigiCiz();
});

document.getElementById("grafikTipi").addEventListener("change", (e) => {
  aktifTip = e.target.value;
  grafigiCiz();
});

document.getElementById("takipBtn").addEventListener("click", (e) => {
  e.target.classList.toggle("aktif");
  e.target.textContent = e.target.classList.contains("aktif") ? "✓ Takip Ediliyor" : "+ Takip Et";
});

// ============================================
// BAŞLAT
// ============================================
ilListesiOlustur();
grafigiCiz();
