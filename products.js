// ============================================
// ÜRÜN KATALOĞU
// Her ana ürünün alt tipleri. "Genel" = elimizdeki mevcut,
// çeşide ayrılmamış veri (Supabase'de urun="Domates" gibi
// düz kayıtlı olanlar). Diğerleri ileride veri geldikçe dolacak,
// şimdilik "veri yok" gösterir ama arayüz hazır.
// ============================================
const URUN_KATALOG = {
  "Domates":   { emoji: "🍅", altTipler: ["Genel", "Salkım", "Pembe", "Grill", "Beef", "Kokteyl", "Salçalık"] },
  "Biber":     { emoji: "🌶️", altTipler: ["Genel", "Dolma", "Sivri", "Çarliston", "Kapya"] },
  "Salatalık": { emoji: "🥒", altTipler: ["Genel"] },
  "Patlıcan":  { emoji: "🍆", altTipler: ["Genel"] },
  "Karpuz":    { emoji: "🍉", altTipler: ["Genel"] },
};

// Supabase'deki 'urun' kolonuna karşılık gelen tam ad.
function tamUrunAdi(anaUrun, altTip) {
  return altTip === "Genel" ? anaUrun : `${anaUrun} ${altTip}`;
}

// ============================================
// İLLER — artık sabit renkleri yok, renk artık ürün tipine ait.
// ============================================
const ILLER = [
  { id: "antalya",  ad: "Antalya" },
  { id: "istanbul", ad: "İstanbul" },
  { id: "bursa",    ad: "Bursa" },
  { id: "izmir",    ad: "İzmir" },
  { id: "mersin",   ad: "Mersin" },
  { id: "adana",    ad: "Adana" },
  { id: "yalova",   ad: "Yalova" },
];

// ============================================
// RENK PALETİ — takip listesine eklenen her ürün tipi
// (örn. "Domates - Salkım") bu 6 renkten birini, ekleniş
// sırasına göre alır. En fazla 6 tip takip edilebilir.
// ============================================
const RENK_PALETI = ["#dc2626", "#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0891b2"];

// Bir rengin, il sırasına göre (0=ilk seçilen il, 3=dördüncü) tonu.
// 0 = tam renk, sonrakiler beyaza doğru açılır.
function tonlaVer(hex, seviye) {
  const acilma = [0, 0.28, 0.52, 0.72][seviye] ?? 0.72;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yeniR = Math.round(r + (255 - r) * acilma);
  const yeniG = Math.round(g + (255 - g) * acilma);
  const yeniB = Math.round(b + (255 - b) * acilma);
  return `rgb(${yeniR},${yeniG},${yeniB})`;
}

// İl seçim sırasına göre (0..3) gösterge tipi.
const GOSTERGE_TIPLERI = ["cizgi", "geometrik", "nokta", "kolon"];

function gostergeAyari(tip) {
  switch (tip) {
    case "cizgi":     return { type: "line", tension: 0,   pointRadius: 2, borderWidth: 2,   fill: false, showLine: true };
    case "geometrik": return { type: "line", tension: 0.5, pointRadius: 0, borderWidth: 2.5, fill: true,  showLine: true };
    case "nokta":     return { type: "line", tension: 0,   pointRadius: 4, borderWidth: 0,   fill: false, showLine: false };
    case "kolon":     return { type: "bar" };
    default:          return { type: "line" };
  }
}
