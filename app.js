const URUN_YOKSAY = [
  'diger', 'diğer',
  'muhtelif',
  'cesitli', 'çeşitli',
  'koy', 'köy',
  'tarla',
  'other',
  'aci', 'acı'   // "Biber Kil Aci" -> kil sivri birlesiminde sadeleşsin
]

const URUN_ESLESMELER = {
  'avakado': 'avokado',
  'avacado': 'avokado',
  'capia': 'kapya',
  'kapia': 'kapya',
  'anjelik': 'anjelika',
  'anjelıka': 'anjelika',
  'bogrulce': 'borulce',
  'böğrülce': 'borulce',
  'borulce': 'borulce',
  'börülce': 'borulce',
  'çarli': 'carliston',
  'carli': 'carliston',
  'çarliston': 'carliston',
  'carliston': 'carliston',
  'cherry': 'ceri',
  'çeri': 'ceri',
  'ceri': 'ceri',
  'incir': 'incir',
  'ıncir': 'incir',
  'incır': 'incir',
  'ıncır': 'incir'
}

const URUN_GOSTERIM = {
  'avokado': 'Avokado',
  'biber kapya': 'Biber Kapya',
  'biber ucburun': 'Biber Üçburun',
  'biber kil sivri': 'Biber Kıl Sivri',
  'biber carliston': 'Biber Çarliston',
  'armut santamaria': 'Armut Santamaria',
  'elma granny smith': 'Elma Granny Smith',
  'erik anjelika': 'Erik Anjelika',
  'can erik': 'Can Erik',
  'erik': 'Can Erik',
  'fasulye taze': 'Fasulye Taze',
  'hindistan cevizi': 'Hindistan Cevizi',
  'incir beyaz': 'İncir Beyaz',
  'borulce': 'Börülce',
  'feslegen reyhan': 'Fesleğen Reyhan',
  'fesleğen reyhan': 'Fesleğen Reyhan',
  'domates salkim ceri': 'Domates Salkım Çeri'
}

function normalizeUrun(ad) {
  let t = String(ad || '').trim().toLocaleLowerCase('tr')

  // parantez / noktalama
  t = t.replace(/[()[\]{}:;,./\\|_+\-–—'"`´]/g, ' ')
  t = t.replace(/\s+/g, ' ').trim()

  // --- ozel birlesikler (sira onemli, tekrar etmeyecek sekilde) ---

  // granny smith: once tam ifade, sonra tek "granny"; asla smith smith yapma
  t = t.replace(/\bgrannysm[iı]th\b/g, 'granny_smith')
  t = t.replace(/\bgransimit\b/g, 'granny_smith')
  t = t.replace(/\bgsmit\b/g, 'granny_smith')
  t = t.replace(/\bgranny\s+smith\b/g, 'granny_smith')
  t = t.replace(/\bgranny\b/g, 'granny_smith')
  t = t.replace(/\bgranny_smith(?:\s+smith)+\b/g, 'granny_smith') // smith smith temizle
  t = t.replace(/granny_smith/g, 'granny smith')

  // santamaria
  t = t.replace(/\bs\s*mar[iı]a\b/g, 'santamaria')
  t = t.replace(/\bsanta\s*mar[iı]a\b/g, 'santamaria')

  // hindistan cevizi
  t = t.replace(/\bh[iı]nd[iı]stan\s*cev[iı]z[iı]\b/g, 'hindistan cevizi')

  // borulce varyantlari
  t = t.replace(/\bb[öo]ğ?r[üu]lce\b/g, 'borulce')
  t = t.replace(/\bborulce\b/g, 'borulce')

  // uc burun / ucburun
  t = t.replace(/\büç\s*burun\b/g, 'ucburun')
  t = t.replace(/\buc\s*burun\b/g, 'ucburun')
  t = t.replace(/\büçburun\b/g, 'ucburun')
  t = t.replace(/\bucburun\b/g, 'ucburun')

  // carliston
  t = t.replace(/\bçarliston\b/g, 'carliston')
  t = t.replace(/\bçarli\b/g, 'carliston')
  t = t.replace(/\bcarli\b/g, 'carliston')

  // ceri / cherry
  t = t.replace(/\bcherry\b/g, 'ceri')
  t = t.replace(/\bçeri\b/g, 'ceri')

  // yok sayilacak kelimeler
  t = t.split(' ').filter(function (w) {
    return w && URUN_YOKSAY.indexOf(w) === -1
  }).join(' ')

  // kelime esleme
  t = t.split(' ').map(function (w) {
    return URUN_ESLESMELER[w] || w
  }).join(' ')

  // --- urun bazli kanonik isimler ---

  // duz "erik" -> can erik
  if (t === 'erik') t = 'can erik'

  // biber kil / sivri kil / kil sivri / kil aci -> biber kil sivri
  if (t.indexOf('biber') !== -1 && (t.indexOf('kil') !== -1 || t.indexOf('kıl') !== -1)) {
    t = 'biber kil sivri'
  }

  // feslegen (+ reyhan isteğe bagli) -> feslegen reyhan
  if (t === 'feslegen' || t === 'fesleğen' || t.indexOf('feslegen') === 0 || t.indexOf('fesleğen') === 0) {
    t = 'feslegen reyhan'
  }

  // domates ceri / salkim ceri / cherry -> domates salkim ceri
  if (t.indexOf('domates') !== -1 && t.indexOf('ceri') !== -1) {
    t = 'domates salkim ceri'
  }

  // fasulye ayse / kadin -> fasulye taze
  if (t.indexOf('fasulye') === 0) {
    if (t.indexOf('ayse') !== -1 || t.indexOf('kadın') !== -1 || t.indexOf('kadin') !== -1 || t === 'fasulye taze') {
      t = 'fasulye taze'
    }
  }

  // biber carliston
  if (t.indexOf('biber') !== -1 && t.indexOf('carliston') !== -1) {
    t = 'biber carliston'
  }

  // biber ucburun
  if (t.indexOf('biber') !== -1 && t.indexOf('ucburun') !== -1) {
    t = 'biber ucburun'
  }

  if (URUN_ESLESMELER[t]) return URUN_ESLESMELER[t]
  return t
}
