// ============================================
// KİŞİSEL TAKİP DURUMU (localStorage'da saklanıyor)
// Her kayıt: { anaUrun, altTip, renkIndex, iller:[ilId,...], turkiye:bool }
// En fazla 6 kayıt, iller dizisi en fazla 4 eleman (sırası = gösterge tipi sırası)
// ============================================
const STORAGE_KEY = "kisisel_takip_v1";
let takipListesi = [];
try { takipListesi = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { takipListesi = []; }

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
  if (takipListesi.length >= 6) {
    alert("En fazla 6 ürün tipi takip edebilirsin. Önce listeden birini çıkar (cip üzerindeki × işareti).");
    return;
  }
  takipListesi.push({ anaUrun, altTip, renkIndex: bosRenkIndexBul(), iller: [], turkiye: false });
  kaydet();
  herseyiCiz();
}

function tipCikar(anaUrun, altTip) {
  takipListesi = takipListesi.filter(t => !(t.anaUrun === anaUrun && t.altTip === altTip));
  if (acikIlPanelKey === anaUrun + "|" + altTip) acikIlPanelKey = null;
  kaydet();
  herseyiCiz();
}

function ilToggle(anaUrun, altTip, ilId) {
  const t = takipListesi.find(x => x.anaUrun === anaUrun && x.altTip === altTip);
  if (!t) return;
  const idx = t.iller.indexOf(ilId);
  if (idx >= 0) {
    t.iller.splice(idx, 1);
  } else {
    if (t.iller.length >= 4) {
      alert("Bu ürün tipi için en fazla 4 il seçebilirsin.");
      return;
    }
    t.iller.push(ilId);
  }
  kaydet();
  herseyiCiz();
}

function turkiyeToggle(anaUrun, altTip) {
  const t = takipListesi.find(x => x.anaUrun === anaUrun && x.altTip === altTip);
  if (!t) return;
  t.turkiye = !t.turkiye;
  kaydet();
  herseyiCiz();
}

function ilAdiBul(id) {
  return (ILLER.find(x => x.id === id) || {}).ad || id;
}

function gostergeAdi(tip) {
  return { cizgi: "Çizgi", geometrik: "Geometrik", nokta: "Nokta", kolon: "Kolon" }[tip] || "";
}

function hexRgba(colorStr, alpha) {
  if (colorStr.startsWith("rgb(")) return colorStr.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
  const r = parseInt(colorStr.slice(1, 3), 16), g = parseInt(colorStr.slice(3, 5), 16), b = parseInt(colorStr.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ============================================
// KİŞİSELLEŞTİRME BANDI — takip cipleri
// ============================================
function cipleriCiz() {
  const kutu = document.getElementById("takipCipleri");
  kutu.innerHTML = takipListesi.map(t => {
    const renk = RENK_PALETI[t.renkIndex];
    const ad = tamUrunAdi(t.anaUrun, t.altTip);
    return `
      <button class="takip-cip" data-key="${t.anaUrun}|${t.altTip}" style="border-color:${renk};color:${renk}">
        <span class="cip-nokta" style="background:${renk}"></span>${ad}
        <span class="cip-kaldir" data-aksiyon="kaldir">×</span>
      </button>`;
  }).join("");

  kutu.querySelectorAll(".takip-cip").forEach(cip => {
    const [anaUrun, altTip] = cip.dataset.key.split("|");
    cip.addEventListener("click", (e) => {
      if (e.target.dataset.aksiyon === "kaldir") { tipCikar(anaUrun, altTip); return; }
      ilPanelAc(anaUrun, altTip);
    });
  });

  document.getElementById("productCount").textContent = takipListesi.length;
}

// ============================================
// İL SEÇİM PANELİ — bir cip'e tıklanınca açılır
// ============================================
let acikIlPanelKey = null;

function ilPanelAc(anaUrun, altTip) {
  const key = anaUrun + "|" + altTip;
  acikIlPanelKey = (acikIlPanelKey === key) ? null : key;
  ilPanelCiz();
}

function ilPanelCiz() {
  const panel = document.getElementById("ilSecimPanel");
  if (!acikIlPanelKey) { panel.style.display = "none"; panel.innerHTML = ""; return; }

  const [anaUrun, altTip] = acikIlPanelKey.split("|");
  const t = takipListesi.find(x => x.anaUrun === anaUrun && x.altTip === altTip);
  if (!t) { panel.style.display = "none"; return; }
  const renk = RENK_PALETI[t.renkIndex];

  panel.style.display = "block";
  panel.innerHTML = `
    <div class="il-panel-baslik">${tamUrunAdi(anaUrun, altTip)} — il seç (en fazla 4)</div>
    <div class="il-panel-satirlar">
      <label class="il-secenek">
        <input type="checkbox" data-aksiyon="turkiye" ${t.turkiye ? "checked" : ""}>
        Türkiye geneli ortalaması
      </label>
      ${ILLER.map(il => {
        const seciliMi = t.iller.includes(il.id);
        const sira = t.iller.indexOf(il.id);
        const gosterge = seciliMi ? GOSTERGE_TIPLERI[sira] : null;
        return `
          <label class="il-secenek">
            <input type="checkbox" data-aksiyon="il" data-il="${il.id}" ${seciliMi ? "checked" : ""}>
            ${il.ad}
            ${seciliMi ? `<span class="il-etiket" style="background:${tonlaVer(renk, sira)}">${gostergeAdi(gosterge)}</span>` : ""}
          </label>`;
      }).join("")}
    </div>
  `;

  panel.querySelector('[data-aksiyon="turkiye"]').addEventListener("change", () => turkiyeToggle(anaUrun, altTip));
  panel.querySelectorAll('[data-aksiyon="il"]').forEach(cb => {
    cb.addEventListener("change", () => ilToggle(anaUrun, altTip, cb.dataset.il));
  });
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
      <div class="katalog-urun-baslik">${bilgi.emoji} ${anaUrun}</div>
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
    .from("fiyatlar")
    .select("tarih, min_fiyat, max_fiyat")
    .eq("urun", urunTam).eq("il", ilAdi)
    .gte("tarih", baslangic)
    .order("tarih");
  if (error) { console.error(error); return []; }
  return data;
}

async function veriGetirTurkiye(urunTam, gunSayisi) {
  const baslangic = new Date(Date.now() - gunSayisi * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabaseClient
    .from("fiyatlar")
    .select("tarih, il, min_fiyat, max_fiyat")
    .eq("urun", urunTam)
    .gte("tarih", baslangic)
    .order("tarih");
  if (error) { console.error(error); return []; }

  const gruplar = {};
  data.forEach(r => { (gruplar[r.tarih] ||= []).push(r); });
  return Object.entries(gruplar).map(([tarih, satirlar]) => ({
    tarih,
    min_fiyat: satirlar.reduce((s, x) => s + x.min_fiyat, 0) / satirlar.length,
    max_fiyat: satirlar.reduce((s, x) => s + x.max_fiyat, 0) / satirlar.length,
  })).sort((a, b) => a.tarih.localeCompare(b.tarih));
}

// ============================================
// CANLI GRAFİK
// ============================================
let canliChart = null;
let aktifAralik = "hafta";

async function grafigiCiz() {
  const kutu = document.querySelector(".grafik-kutu");

  if (takipListesi.length === 0) {
    kutu.innerHTML = `<p style="text-align:center;color:#777;padding-top:140px">Henüz takip ettiğin bir ürün yok. "+ Ürün Ekle" ile başla.</p>`;
    return;
  }
  if (!document.getElementById("canliGrafik")) {
    kutu.innerHTML = `<canvas id="canliGrafik"></canvas>`;
  }

  const gunSayisi = { hafta: 7, ay: 30, yil: 365 }[aktifAralik];
  const tumTarihler = new Set();
  const gorevler = [];

  takipListesi.forEach(t => {
    const urunTam = tamUrunAdi(t.anaUrun, t.altTip);
    const renk = RENK_PALETI[t.renkIndex];

    t.iller.forEach((ilId, sira) => {
      const ilAdi = ilAdiBul(ilId);
      gorevler.push(
        veriGetirIl(urunTam, ilAdi, gunSayisi).then(satirlar => {
          satirlar.forEach(s => tumTarihler.add(s.tarih));
          return { label: `${urunTam} — ${ilAdi}`, renk: tonlaVer(renk, sira), tip: GOSTERGE_TIPLERI[sira], veri: satirlar };
        })
      );
    });

    if (t.turkiye) {
      gorevler.push(
        veriGetirTurkiye(urunTam, gunSayisi).then(satirlar => {
          satirlar.forEach(s => tumTarihler.add(s.tarih));
          return { label: `${urunTam} — Türkiye Ort.`, renk, tip: "cizgi", veri: satirlar, turkiyeMi: true };
        })
      );
    }
  });

  const sonuclar = await Promise.all(gorevler);
  const tarihler = [...tumTarihler].sort();

  if (tarihler.length === 0) {
    kutu.innerHTML = `<p style="text-align:center;color:#777;padding-top:140px">Seçtiğin ürün/il kombinasyonları için bu aralıkta veri yok.</p>`;
    return;
  }

  const etiketler = tarihler.map(t => new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }));

  const datasets = sonuclar.map(sonuc => {
    const ayar = gostergeAyari(sonuc.tip);
    const veriMap = {};
    sonuc.veri.forEach(s => veriMap[s.tarih] = +((s.min_fiyat + s.max_fiyat) / 2).toFixed(2));
    const dizi = tarihler.map(t => veriMap[t] ?? null);

    return {
      label: sonuc.label,
      data: dizi,
      borderColor: sonuc.renk,
      backgroundColor: ayar.type === "bar" ? sonuc.renk : (ayar.fill ? hexRgba(sonuc.renk, 0.15) : sonuc.renk),
      borderDash: sonuc.turkiyeMi ? [6, 3] : undefined,
      spanGaps: false,
      ...ayar,
    };
  });

  const config = {
    type: "line",
    data: { labels: etiketler, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } },
      scales: { y: { ticks: { callback: v => v + " ₺" } } },
    },
  };

  if (canliChart) canliChart.destroy();
  canliChart = new Chart(document.getElementById("canliGrafik"), config);
}

// ============================================
// LİSTE TABLOSU — takip edilen (ürün, il) çiftlerinin son değeri
// ============================================
async function tabloCiz() {
  const tablo = document.getElementById("priceTable");

  if (takipListesi.length === 0) {
    tablo.innerHTML = `<tr><td colspan="4">Henüz takip ettiğin bir ürün yok.</td></tr>`;
    return;
  }

  const satirlar = [];
  for (const t of takipListesi) {
    const urunTam = tamUrunAdi(t.anaUrun, t.altTip);
    for (const ilId of t.iller) {
      const ilAdi = ilAdiBul(ilId);
      const { data } = await supabaseClient
        .from("fiyatlar").select("*")
        .eq("urun", urunTam).eq("il", ilAdi)
        .order("tarih", { ascending: false }).limit(1);
      if (data && data.length > 0) {
        satirlar.push({ urun: urunTam, il: ilAdi, min: data[0].min_fiyat, max: data[0].max_fiyat, tarih: data[0].tarih });
      } else {
        satirlar.push({ urun: urunTam, il: ilAdi, min: "—", max: "—", tarih: null });
      }
    }
    if (t.turkiye) {
      const tv = await veriGetirTurkiye(urunTam, 365);
      if (tv.length > 0) {
        const son = tv[tv.length - 1];
        satirlar.push({ urun: urunTam, il: "Türkiye (ort.)", min: son.min_fiyat.toFixed(2), max: son.max_fiyat.toFixed(2), tarih: son.tarih });
      }
    }
  }

  if (satirlar.length === 0) {
    tablo.innerHTML = `<tr><td colspan="4">Bir ürün tipine tıklayıp il seç, burada görünsün.</td></tr>`;
    return;
  }

  tablo.innerHTML = satirlar.map(s => `<tr><td>${s.urun}</td><td>${s.il}</td><td>${s.min}</td><td>${s.max}</td></tr>`).join("");

  const enYeni = satirlar.filter(s => s.tarih).reduce((en, s) => (!en || s.tarih > en) ? s.tarih : en, null);
  document.getElementById("updateTime").textContent = enYeni ? new Date(enYeni).toLocaleDateString("tr-TR") : "-";
}

// ============================================
// HER ŞEYİ YENİLE
// ============================================
async function herseyiCiz() {
  cipleriCiz();
  ilPanelCiz();
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

herseyiCiz();
