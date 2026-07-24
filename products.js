// ============================================
// ÜRÜN KATALOĞU
// Her ana ürünün alt tipleri. "Genel" = elimizdeki mevcut,
// çeşide ayrılmamış veri (Supabase'de urun="Domates" gibi
// düz kayıtlı olanlar). Diğerleri ileride veri geldikçe dolacak,
// şimdilik "veri yok" gösterir ama arayüz hazır.
//
// NOT: altTip metinleri Supabase'deki 'urun' kolonuyla BİREBİR
// eşleşmeli (tamUrunAdi ile birleştiriliyor). Yeni bir il/kaynak
// eklerken oradaki ürün adlarını buraya eklerken tam olarak aynı
// yazımı kullanmaya dikkat et.
// ============================================
const URUN_KATALOG = {
  "Domates":   { emoji: "🍅", altTipler: ["Genel", "Salkım", "Pembe", "Grill", "Beef", "Kokteyl", "Salçalık", "Cherry", "Sera"] },
  "Biber":     { emoji: "🌶️", altTipler: ["Genel", "Dolma", "Sivri", "Çarliston", "Kapya", "Köybiberi"] },
  "Salatalık": { emoji: "🥒", altTipler: ["Genel", "Silor"] },
  "Patlıcan":  { emoji: "🍆", altTipler: ["Genel"] },
  "Karpuz":    { emoji: "🍉", altTipler: ["Genel"] },

  // --- Afyonkarahisar Belediyesi Toptancı Hal Müdürlüğü kataloğundan eklendi ---
  "Ananas":    { emoji: "🍍", altTipler: ["Genel", "İthal"] },
  "Armut":     { emoji: "🍐", altTipler: ["Genel", "Deveci", "Santamaria"] },
  "Elma":      { emoji: "🍎", altTipler: ["Genel", "Starking", "Golden", "Granny Smıth", "Arapkızı"] },
  "Erik":      { emoji: "🍑", altTipler: ["Genel", "Anjelik"] },
  "Fasulye":   { emoji: "🫘", altTipler: ["Genel", "Ayşe"] },
  "Havuç":     { emoji: "🥕", altTipler: ["Genel", "Beypazarı", "İri (Takoz)"] },
  "Limon":     { emoji: "🍋", altTipler: ["Genel", "Mayer", "Yatak"] },
  "Marul":     { emoji: "🥬", altTipler: ["Genel", "Kıvırcık"] },
  "Muz":       { emoji: "🍌", altTipler: ["Genel", "Anamur", "İthal"] },
  "Patates":   { emoji: "🥔", altTipler: ["Genel", "Eski Mahsül", "Yeni Mahsül"] },
  "Portakal":  { emoji: "🍊", altTipler: ["Genel", "Finike", "Köyceğiz", "Sıkmalık", "Yeni Mahsül"] },
  "Soğan":     { emoji: "🧅", altTipler: ["Genel", "Kuru", "Yeni Mahsül"] },
  "Üzüm":      { emoji: "🍇", altTipler: ["Genel", "Siyah"] },
  "Turp":      { emoji: "🔴", altTipler: ["Genel", "Kırmızı"] },
  "Sarımsak":  { emoji: "🧄", altTipler: ["Genel", "Taze"] },

  // Tek başına duran, alt tipe ayrılmayan ürünler (altTip her zaman "Genel")
  "Avokado":            { emoji: "🥑", altTipler: ["Genel"] },
  "Aysberg":             { emoji: "🥬", altTipler: ["Genel"] },
  "Ayva":                { emoji: "🍐", altTipler: ["Genel"] },
  "Balkabağı":           { emoji: "🎃", altTipler: ["Genel"] },
  "Beyaz Lahana Azman":  { emoji: "🥬", altTipler: ["Genel"] },
  "Brokoli":             { emoji: "🥦", altTipler: ["Genel"] },
  "Çilek":               { emoji: "🍓", altTipler: ["Genel"] },
  "Dereotu":             { emoji: "🌿", altTipler: ["Genel"] },
  "Greyfurt":            { emoji: "🍊", altTipler: ["Genel"] },
  "Ispanak":             { emoji: "🥬", altTipler: ["Genel"] },
  "K.bahar":             { emoji: "🌿", altTipler: ["Genel"] },
  "Kabak":               { emoji: "🥒", altTipler: ["Genel"] },
  "Kavun":               { emoji: "🍈", altTipler: ["Genel"] },
  "Kaysı":               { emoji: "🍑", altTipler: ["Genel"] },
  "Kestane":             { emoji: "🌰", altTipler: ["Genel"] },
  "Kırmızı Lahana":      { emoji: "🥬", altTipler: ["Genel"] },
  "Kiraz":               { emoji: "🍒", altTipler: ["Genel"] },
  "Kivi":                { emoji: "🥝", altTipler: ["Genel"] },
  "Lahana":              { emoji: "🥬", altTipler: ["Genel"] },
  "Lolorosso":           { emoji: "🥬", altTipler: ["Genel"] },
  "Mandalina":           { emoji: "🍊", altTipler: ["Genel"] },
  "Mantar":              { emoji: "🍄", altTipler: ["Genel"] },
  "Maydanoz":            { emoji: "🌿", altTipler: ["Genel"] },
  "Nane":                { emoji: "🌿", altTipler: ["Genel"] },
  "Nar":                 { emoji: "🔴", altTipler: ["Genel"] },
  "Pırasa":              { emoji: "🌿", altTipler: ["Genel"] },
  "Roka":                { emoji: "🌿", altTipler: ["Genel"] },
  "Şeftali":             { emoji: "🍑", altTipler: ["Genel"] },
  "Tere":                { emoji: "🌿", altTipler: ["Genel"] },
  "Y.dünya":             { emoji: "🟡", altTipler: ["Genel"] },
  "Yeşil Soğan":         { emoji: "🌱", altTipler: ["Genel"] },
};

// Supabase'deki 'urun' kolonuna karşılık gelen tam ad.
function tamUrunAdi(anaUrun, altTip) {
  return altTip === "Genel" ? anaUrun : `${anaUrun} ${altTip}`;
}

// ============================================
// İLLER — artık sabit renkleri yok, renk artık ürün tipine ait.
// "ad" alanı Supabase'deki 'il' kolonuyla BİREBİR eşleşmeli.
// Bazı büyükşehirlerde birden fazla hal olabildiği için (İstanbul'da
// Avrupa/Anadolu Yakası, Antalya'da merkez/Alanya gibi) gerektikçe
// "Şehir / İlçe" biçiminde ayrı satırlar ekleniyor.
// ============================================
const ILLER = [
  // --- Veri girilmiş / girilmeye başlanmış iller (mevcut id'ler korunuyor) ---
  { id: "antalya",         ad: "Antalya" },
  { id: "antalya_alanya",  ad: "Antalya / Alanya" },
  { id: "istanbul",        ad: "İstanbul" },
  { id: "bursa",           ad: "Bursa" },
  { id: "izmir",           ad: "İzmir" },
  { id: "mersin",          ad: "Mersin" },
  { id: "adana",           ad: "Adana" },
  { id: "yalova",          ad: "Yalova" },
  { id: "afyonkarahisar",  ad: "Afyonkarahisar" },

  // --- Henüz veri girilmemiş diğer iller (plaka sırası) ---
  { id: "adiyaman",        ad: "Adıyaman" },
  { id: "agri",            ad: "Ağrı" },
  { id: "amasya",          ad: "Amasya" },
  { id: "ankara",          ad: "Ankara" },
  { id: "artvin",          ad: "Artvin" },
  { id: "aydin",           ad: "Aydın" },
  { id: "balikesir",       ad: "Balıkesir" },
  { id: "bilecik",         ad: "Bilecik" },
  { id: "bingol",          ad: "Bingöl" },
  { id: "bitlis",          ad: "Bitlis" },
  { id: "bolu",            ad: "Bolu" },
  { id: "burdur",          ad: "Burdur" },
  { id: "canakkale",       ad: "Çanakkale" },
  { id: "cankiri",         ad: "Çankırı" },
  { id: "corum",           ad: "Çorum" },
  { id: "denizli",         ad: "Denizli" },
  { id: "diyarbakir",      ad: "Diyarbakır" },
  { id: "edirne",          ad: "Edirne" },
  { id: "elazig",          ad: "Elazığ" },
  { id: "erzincan",        ad: "Erzincan" },
  { id: "erzurum",         ad: "Erzurum" },
  { id: "eskisehir",       ad: "Eskişehir" },
  { id: "gaziantep",       ad: "Gaziantep" },
  { id: "giresun",         ad: "Giresun" },
  { id: "gumushane",       ad: "Gümüşhane" },
  { id: "hakkari",         ad: "Hakkari" },
  { id: "hatay",           ad: "Hatay" },
  { id: "isparta",         ad: "Isparta" },
  { id: "kars",            ad: "Kars" },
  { id: "kastamonu",       ad: "Kastamonu" },
  { id: "kayseri",         ad: "Kayseri" },
  { id: "kirklareli",      ad: "Kırklareli" },
  { id: "kirsehir",        ad: "Kırşehir" },
  { id: "kocaeli",         ad: "Kocaeli" },
  { id: "konya",           ad: "Konya" },
  { id: "kutahya",         ad: "Kütahya" },
  { id: "malatya",         ad: "Malatya" },
  { id: "manisa",          ad: "Manisa" },
  { id: "kahramanmaras",   ad: "Kahramanmaraş" },
  { id: "mardin",          ad: "Mardin" },
  { id: "mugla",           ad: "Muğla" },
  { id: "mus",             ad: "Muş" },
  { id: "nevsehir",        ad: "Nevşehir" },
  { id: "nigde",           ad: "Niğde" },
  { id: "ordu",            ad: "Ordu" },
  { id: "rize",            ad: "Rize" },
  { id: "sakarya",         ad: "Sakarya" },
  { id: "samsun",          ad: "Samsun" },
  { id: "siirt",           ad: "Siirt" },
  { id: "sinop",           ad: "Sinop" },
  { id: "sivas",           ad: "Sivas" },
  { id: "tekirdag",        ad: "Tekirdağ" },
  { id: "tokat",           ad: "Tokat" },
  { id: "trabzon",         ad: "Trabzon" },
  { id: "tunceli",         ad: "Tunceli" },
  { id: "sanliurfa",       ad: "Şanlıurfa" },
  { id: "usak",            ad: "Uşak" },
  { id: "van",             ad: "Van" },
  { id: "yozgat",          ad: "Yozgat" },
  { id: "zonguldak",       ad: "Zonguldak" },
  { id: "aksaray",         ad: "Aksaray" },
  { id: "bayburt",         ad: "Bayburt" },
  { id: "karaman",         ad: "Karaman" },
  { id: "kirikkale",       ad: "Kırıkkale" },
  { id: "batman",          ad: "Batman" },
  { id: "sirnak",          ad: "Şırnak" },
  { id: "bartin",          ad: "Bartın" },
  { id: "ardahan",         ad: "Ardahan" },
  { id: "igdir",           ad: "Iğdır" },
  { id: "karabuk",         ad: "Karabük" },
  { id: "kilis",           ad: "Kilis" },
  { id: "osmaniye",        ad: "Osmaniye" },
  { id: "duzce",           ad: "Düzce" },
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
