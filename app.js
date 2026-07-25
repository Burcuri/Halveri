// ============================================
// GLOBAL İL SEÇİMİ (kişiselleştirme) — tek sefer seçilir,
// tüm takip edilen ürün tiplerine otomatik uygulanır.
// İleride bu, ayrı bir login/hesap sisteminden gelecek;
// şimdilik tarayıcıda saklıyoruz.
// ============================================
const IL_STORAGE_KEY = "kisisel_iller_v1";
let seciliIller = [];      // sıra = gösterge tipi sırası, en fazla 4
let turkiyeGeneli = false;

try {
  const kayit = JSON.parse(localStorage.getItem(IL_STORAGE_KEY)) || {};
  seciliIller = kayit.iller || [];
  turkiyeGeneli = kayit.turkiye || false;
} catch (e) { seciliIller = []; turkiyeGeneli = false; }

function ilSecimKaydet() {
  localStorage.setItem(IL_STORAGE_KEY, JSON.stringify({ iller: seciliIller, turkiye: turkiyeGeneli }));
}

function ilBandiToggle(ilId) {
  const idx = seciliIller.indexOf(ilId);
  if (idx >= 0) {
    seciliIller.splice(idx, 1);
  } else {
    if (seciliIller.length >= MAX_IL) { alert(`En fazla ${MAX_IL} il seçebilirsin.`); return; }
    seciliIller.push(ilId);
  }
  ilSecimKaydet();
  herseyiCiz();
}

function turkiyeGeneliToggle() {
  turkiyeGeneli = !turkiyeGeneli;
  ilSecimKaydet();
  herseyiCiz();
}

// ============================================
// REFERANS SERİLERİ (Enflasyon / Mazot) — açık/kapalı durumu
// ============================================
const REFERANS_STORAGE_KEY = "kisisel_referans_v1";
let aktifReferanslar = [];
try {
  aktifReferanslar = JSON.parse(localStorage.getItem(REFERANS_STORAGE_KEY)) || [];
} catch (e) { aktifReferanslar = []; }

function referansKaydet() {
  localStorage.setItem(REFERANS_STORAGE_KEY, JSON.stringify(aktifReferanslar));
}

function referansToggle(id) {
  const idx = aktifReferanslar.indexOf(id);
  if (idx >= 0) aktifReferanslar.splice(idx, 1);
  else aktifReferanslar.push(id);
  referansKaydet();
  herseyiCiz();
}

function referansPanelCiz() {
  const kutu = document.getElementById("referansSatirlari");
  if (!kutu) return;
  kutu.innerHTML = REFERANS_SERILER.map(r => `
    <label class="il-secenek">
      <input type="checkbox" data-referans="${r.id}" ${aktifReferanslar.includes(r.id) ? "checked" : ""}>
      ${r.ad}
    </label>`).join("");
  kutu.querySelectorAll("[data-referans]").forEach(cb => {
    cb.addEventListener("change", () => referansToggle(cb.dataset.referans));
  });
}

document.getElementById("referansBtn")?.addEventListener("click", () => {
  const panel = document.getElementById("referansPanel");
  panel.style.display = (panel.style.display === "none") ? "block" : "none";
});

function ilBandiCiz() {
  document.getElementById("illerSayisi").textContent =
    (seciliIller.length + (turkiyeGeneli ? 1 : 0)) > 0 ? `(${seciliIller.length + (turkiyeGeneli ? 1 : 0)})` : "";

  const kutu = document.getElementById("ilBandiSatirlari");
  kutu.innerHTML = `
    <label class="il-secenek il-secenek-turkiye">
      <input type="checkbox" data-aksiyon="turkiye" ${turkiyeGeneli ? "checked" : ""}>
      Türkiye geneli ortalaması
    </label>
    ${ILLER.map(il => {
      const seciliMi = seciliIller.includes(il.id);
      const sira = seciliIller.indexOf(il.id);
      const gosterge = seciliMi ? GOSTERGE_TIPLERI[sira] : null;
      return `
        <label class="il-secenek">
          <input type="checkbox" data-aksiyon="il" data-il="${il.id}" ${seciliMi ? "checked" : ""}>
          ${il.ad}
          ${seciliMi ? `<span class="il-etiket il-etiket-notr">${gostergeAdi(gosterge)}</span>` : ""}
        </label>`;
    }).join("")}
  `;
  kutu.querySelector('[data-aksiyon="turkiye"]').addEventListener("change", turkiyeGeneliToggle);
  kutu.querySelectorAll('[data-aksiyon="il"]').forEach(cb => {
    cb.addEventListener("change", () => ilBandiToggle(cb.dataset.il));
  });
}

document.getElementById("illerBtn").addEventListener("click", () => {
  const panel = document.getElementById("illerPanel");
  panel.style.display = (panel.style.display === "none") ? "block" : "none";
});

// ============================================
// TAKİP EDİLEN ÜRÜN TİPLERİ — sadece renk taşıyor artık,
// il/Türkiye bilgisi yok (o global bantta).
// ============================================
const STORAGE_KEY = "kisisel_takip_v1";
let takipListesi = [];
try {
  takipListesi = (JSON.parse(localStorage.getItem(STORAGE_KEY)) || []).map(t => ({
    anaUrun: t.anaUrun, altTip: t.altTip, renkIndex: t.renkIndex,
  }));
} catch (e) { takipListesi = []; }

function kaydet() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(takipListesi));
}

function bosRenkIndexBul() {
  const kullanilan = new Set(takipListesi.map(t => t.renkIndex));
  for (let i = 0; i < RENK_PALETI.length; i++) if (!kullanilan.has(i)) return i;
  return null;
}

function tipEkle(anaUrun, altTip) {
  if (takipListesi.some(t => t.anaUrun === anaUrun && t.altTip === altTip)) return;
  if (takipListesi.length >= MAX_URUN_TIPI) {
    alert(`En fazla ${MAX_URUN_TIPI} ürün tipi takip edebilirsiniz.`);
    return;
  }
  takipListesi.push({ anaUrun, altTip, renkIndex: bosRenkIndexBul() });
  kaydet();
  herseyiCiz();
}

function tipCikar(anaUrun, altTip) {
  takipListesi = takipListesi.filter(t => !(t.anaUrun === anaUrun && t.altTip === altTip));
  kaydet();
  herseyiCiz();
}

function ilAdiBul(id) { return (ILLER.find(x => x.id === id) || {}).ad || id; }
function gostergeAdi(tip) { return { cizgi: "Çizgi", geometrik: "Geometrik", nokta: "Nokta", kolon: "Kolon" }[tip] || ""; }
function hexRgba(colorStr, alpha) {
  if (colorStr.startsWith("rgb(")) return colorStr.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
  const r = parseInt(colorStr.slice(1, 3), 16), g = parseInt(colorStr.slice(3, 5), 16), b = parseInt(colorStr.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ============================================
// TAKİP CİPLERİ (renk = ürün tipi, artık tıklayınca panel açmıyor)
// ============================================
function cipleriCiz() {
  const kutu = document.getElementById("takipCipleri");
  kutu.innerHTML = takipListesi.map(t => {
    const renk = RENK_PALETI[t.renkIndex];
    const ad = tamUrunAdi(t.anaUrun, t.altTip);
    return `
      <span class="takip-cip" style="border-color:${renk};color:${renk}">
        <span class="cip-nokta" style="background:${renk}"></span>${ad}
        <span class="cip-kaldir" data-ana="${t.anaUrun}" data-alt="${t.altTip}">×</span>
      </span>`;
  }).join("");

  kutu.querySelectorAll(".cip-kaldir").forEach(x => {
    x.addEventListener("click", () => tipCikar(x.dataset.ana, x.dataset.alt));
  });

  document.getElementById("productCount").textContent = takipListesi.length;
}

// ============================================
// ÜRÜN EKLEME PANELİ (katalog)
// ============================================
document.getElementById("urunEkleBtn").addEventListener("click", () => {
  const panel = document.getElementById("urunEklePanel");
  const aciliyor = panel.style.display === "none";
  panel.style.display = aciliyor ? "block" : "none";
  if (aciliyor) katalogCiz();
});

function katalogCiz() {
  const kutu = document.getElementById("katalogListesi");
  kutu.innerHTML = Object.entries(URUN_KATALOG).map(([anaUrun, bilgi]) => `
    <div class="katalog-urun">
      <div class="katalog-urun-baslik"><span class="ikon">${bilgi.emoji}</span> ${anaUrun}</div>
      <div class="katalog-alt-tipler">
        ${bilgi.altTipler.map(altTip => {
          const secili = takipListesi.some(t => t.anaUrun === anaUrun && t.altTip === altTip);
          return `
            <label class="alt-tip-secenek">
              <input type="checkbox" data-ana="${anaUrun}" data-alt="${altTip}" ${secili ? "checked" : ""}>
              ${altTip}
            </label>`;
        }).join("")}
      </div>
    </div>
  `).join("");

  kutu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener("change", () => {
      const ana = cb.dataset.ana, alt = cb.dataset.alt;
      if (cb.checked) tipEkle(ana, alt); else tipCikar(ana, alt);
      katalogCiz();
    });
  });
}

// ============================================
// VERİ ÇEKME
// ============================================
async function veriGetirIl(urunTam, ilAdi, gunSayisi) {
  const baslangic = new Date(Date.now() - gunSayisi * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabaseClient
    .from("fiyatlar").select("tarih, min_fiyat, max_fiyat")
    .eq("urun", urunTam).eq("il", ilAdi)
    .gte("tarih", baslangic).order("tarih");
  if (error) { console.error(error); return []; }
  return data;
}

async function veriGetirTurkiye(urunTam, gunSayisi) {
  const baslangic = new Date(Date.now() - gunSayisi * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabaseClient
    .from("fiyatlar").select("tarih, il, min_fiyat, max_fiyat")
    .eq("urun", urunTam).gte("tarih", baslangic).order("tarih");
  if (error) { console.error(error); return []; }
  const gruplar = {};
  data.forEach(r => { (gruplar[r.tarih] ||= []).push(r); });
  return Object.entries(gruplar).map(([tarih, satirlar]) => ({
    tarih,
    min_fiyat: satirlar.reduce((s, x) => s + x.min_fiyat, 0) / satirlar.length,
    max_fiyat: satirlar.reduce((s, x) => s + x.max_fiyat, 0) / satirlar.length,
  })).sort((a, b) => a.tarih.localeCompare(b.tarih));
}

async function veriGetirReferans(tip, gunSayisi) {
  const baslangic = new Date(Date.now() - gunSayisi * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabaseClient
    .from("referans_veriler").select("tarih, deger")
    .eq("tip", tip).gte("tarih", baslangic).order("tarih");
  if (error) { console.error(error); return []; }
  return data;
}

// ============================================
// CANLI GRAFİK — her ürün tipi × global seçili iller/Türkiye
// ============================================
let canliChart = null;
let aktifAralik = "hafta";

async function grafigiCiz() {
  const kutu = document.querySelector(".grafik-kutu");

  if (takipListesi.length === 0) {
    kutu.innerHTML = `<p class="grafik-bos">Henüz takip ettiğin bir ürün yok. "+ Ürün Ekle" ile başla.</p>`;
    return;
  }
  if (seciliIller.length === 0 && !turkiyeGeneli) {
    kutu.innerHTML = `<p class="grafik-bos">Kişisel ayarlardan en az bir il ya da "Türkiye geneli" seçiniz.</p>`;
    return;
  }
  if (!document.getElementById("grafikLegend")) {
    kutu.innerHTML = `
      <div class="grafik-canvas-alani"><canvas id="canliGrafik"></canvas></div>
      <div id="grafikLegend" class="grafik-legend"></div>`;
  }

  try {

  const gunSayisi = { hafta: 7, ay: 30, yil: 365 }[aktifAralik];
  const tumTarihler = new Set();
  const gorevler = [];

  takipListesi.forEach(t => {
    const urunTam = tamUrunAdi(t.anaUrun, t.altTip);
    const renk = RENK_PALETI[t.renkIndex];

    seciliIller.forEach((ilId, sira) => {
      const ilAdi = ilAdiBul(ilId);
      gorevler.push(
        veriGetirIl(urunTam, ilAdi, gunSayisi).then(satirlar => {
          satirlar.forEach(s => tumTarihler.add(s.tarih));
          return { label: `${urunTam} — ${ilAdi}`, renk: tonlaVer(renk, sira), tip: GOSTERGE_TIPLERI[sira], veri: satirlar };
        })
      );
    });

    if (turkiyeGeneli) {
      gorevler.push(
        veriGetirTurkiye(urunTam, gunSayisi).then(satirlar => {
          satirlar.forEach(s => tumTarihler.add(s.tarih));
          return { label: `${urunTam} — Türkiye Ort.`, renk, tip: "cizgi", veri: satirlar, turkiyeMi: true };
        })
      );
    }
  });

  // Referans serileri (Enflasyon / Mazot) — ayrı tablo, ayrı (sağ) eksen
  const referansGorevleri = aktifReferanslar.map(id => {
    const tanim = REFERANS_SERILER.find(r => r.id === id);
    return veriGetirReferans(tanim.tip, gunSayisi).then(satirlar => {
      satirlar.forEach(s => tumTarihler.add(s.tarih));
      return { referans: tanim, veri: satirlar };
    });
  });

  const [sonuclar, referansSonuclari] = await Promise.all([
    Promise.all(gorevler),
    Promise.all(referansGorevleri),
  ]);
  const tarihler = [...tumTarihler].sort();

  if (tarihler.length === 0) {
    kutu.innerHTML = `<p class="grafik-bos">Seçtiğin ürün/il kombinasyonları için bu aralıkta veri yok.</p>`;
    return;
  }

  const etiketler = tarihler.map(t => new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }));

  const datasets = sonuclar.map(sonuc => {
    const ayar = gostergeAyari(sonuc.tip);
    const veriMap = {};
    sonuc.veri.forEach(s => veriMap[s.tarih] = +((s.min_fiyat + s.max_fiyat) / 2).toFixed(2));
    const dizi = tarihler.map(t => veriMap[t] ?? null);
    return {
      label: sonuc.label, data: dizi, borderColor: sonuc.renk,
      backgroundColor: ayar.type === "bar" ? sonuc.renk : (ayar.fill ? hexRgba(sonuc.renk, 0.15) : sonuc.renk),
      borderDash: sonuc.turkiyeMi ? [6, 3] : undefined,
      spanGaps: false, yAxisID: "y", ...ayar,
    };
  });

  // Referans dataset'leri: kalın, gri, sağ eksene bağlı, palet dışı
  referansSonuclari.forEach(({ referans, veri }) => {
    const veriMap = {};
    veri.forEach(s => veriMap[s.tarih] = s.deger);
    const dizi = tarihler.map(t => veriMap[t] ?? null);
    datasets.push({
      label: referans.ad, data: dizi, borderColor: referans.renk,
      backgroundColor: referans.renk, borderWidth: 3, pointRadius: 0, tension: 0.2,
      borderDash: referans.kesikli ? [6, 4] : undefined,
      spanGaps: false, yAxisID: "y1", type: "line", fill: false, showLine: true,
    });
  });

  const referansAktifMi = referansSonuclari.length > 0;

  const config = {
    type: "line",
    data: { labels: etiketler, datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
      interaction: { mode: "nearest", intersect: false },
      plugins: { legend: { display: false } }, // legend'i kendimiz çiziyoruz (aşağıda)
      scales: {
        x: {
          grid: { color: "#EFE9D8" },
          ticks: { font: { family: "'IBM Plex Mono', monospace", size: 10 }, color: "#6B7A70" },
        },
        y: {
          position: "left",
          grid: { color: "#EFE9D8" },
          ticks: {
            callback: v => v + " ₺",
            font: { family: "'IBM Plex Mono', monospace", size: 10 }, color: "#6B7A70",
          },
        },
        ...(referansAktifMi ? {
          y1: {
            position: "right",
            grid: { display: false },
            ticks: { font: { family: "'IBM Plex Mono', monospace", size: 10 }, color: "#8A8A85" },
          },
        } : {}),
      },
    },
  };

  if (canliChart) canliChart.destroy();
  canliChart = new Chart(document.getElementById("canliGrafik"), config);

  // Özel legend — her satıra tıklayınca o seri aç/kapa
  const legendEl = document.getElementById("grafikLegend");
  legendEl.innerHTML = "";
  datasets.forEach((ds, i) => {
    const item = document.createElement("span");
    item.className = "grafik-legend-ogesi";
    item.innerHTML = `<span class="grafik-legend-cizgi" style="background:${ds.borderColor}"></span>${ds.label}`;
    item.addEventListener("click", () => {
      const meta = canliChart.getDatasetMeta(i);
      meta.hidden = meta.hidden === null ? !canliChart.data.datasets[i].hidden : !meta.hidden;
      item.classList.toggle("grafik-legend-sonuk", !!meta.hidden);
      canliChart.update();
    });
    legendEl.appendChild(item);
  });

  } catch (hata) {
    // Grafik çiziminde beklenmeyen bir hata olsa bile sayfanın geri kalanı
    // (Fiyat Defteri, Son Güncelleme vb.) çalışmaya devam etsin diye
    // hatayı burada yutuyoruz — sadece konsola yazıp kullanıcıya nazik bir
    // mesaj gösteriyoruz.
    console.error("Grafik çizilirken hata oluştu:", hata);
    kutu.innerHTML = `<p class="grafik-bos">Grafik yüklenirken bir sorun oluştu. Sayfayı yenilemeyi dene.</p>`;
  }
}

// ============================================
// LİSTE TABLOSU
// ============================================
async function tabloCiz() {
  const tablo = document.getElementById("priceTable");

  if (takipListesi.length === 0) {
    tablo.innerHTML = `<tr><td colspan="4">Henüz takip ettiğin bir ürün yok.</td></tr>`;
    return;
  }
  if (seciliIller.length === 0 && !turkiyeGeneli) {
    tablo.innerHTML = `<tr><td colspan="4">Kişisel ayarlardan en az bir il ya da "Türkiye geneli" seçiniz.</td></tr>`;
    return;
  }

  const satirlar = [];
  for (const t of takipListesi) {
    const urunTam = tamUrunAdi(t.anaUrun, t.altTip);
    for (const ilId of seciliIller) {
      const ilAdi = ilAdiBul(ilId);
      const { data } = await supabaseClient
        .from("fiyatlar").select("*").eq("urun", urunTam).eq("il", ilAdi)
        .order("tarih", { ascending: false }).limit(1);
      satirlar.push(data && data.length > 0
        ? { urun: urunTam, il: ilAdi, min: data[0].min_fiyat, max: data[0].max_fiyat, tarih: data[0].tarih }
        : { urun: urunTam, il: ilAdi, min: "—", max: "—", tarih: null });
    }
    if (turkiyeGeneli) {
      const tv = await veriGetirTurkiye(urunTam, 365);
      if (tv.length > 0) {
        const son = tv[tv.length - 1];
        satirlar.push({ urun: urunTam, il: "Türkiye (ort.)", min: son.min_fiyat.toFixed(2), max: son.max_fiyat.toFixed(2), tarih: son.tarih });
      }
    }
  }

  tablo.innerHTML = satirlar.map(s => `<tr><td>${s.urun}</td><td>${s.il}</td><td>${s.min}</td><td>${s.max}</td></tr>`).join("");

  const enYeni = satirlar.filter(s => s.tarih).reduce((en, s) => (!en || s.tarih > en) ? s.tarih : en, null);
  document.getElementById("updateTime").textContent = enYeni ? new Date(enYeni).toLocaleDateString("tr-TR") : "-";
}

// ============================================
// HER ŞEYİ YENİLE
// ============================================
async function herseyiCiz() {
  ilBandiCiz();
  referansPanelCiz();
  cipleriCiz();
  await grafigiCiz();
  await tabloCiz();
}

document.getElementById("zamanSecim").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;
  document.querySelectorAll("#zamanSecim button").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  aktifAralik = e.target.dataset.aralik;
  grafigiCiz();
});

document.getElementById("updateButton").addEventListener("click", herseyiCiz);

// ============================================
// YASAL BİLGİLENDİRME MODALI
// ============================================
const yasalModal = document.getElementById("yasalModal");
document.getElementById("yasalAcBtn").addEventListener("click", () => {
  yasalModal.style.display = "flex";
});
document.getElementById("yasalAnladimBtn").addEventListener("click", () => {
  yasalModal.style.display = "none";
});
yasalModal.addEventListener("click", (e) => {
  if (e.target === yasalModal) yasalModal.style.display = "none";
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && yasalModal.style.display === "flex") yasalModal.style.display = "none";
});

herseyiCiz();
