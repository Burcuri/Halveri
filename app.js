const SUPABASE_URL = 'https://dmhlysvzyxdgmtatshyc.supabase.co'
const SUPABASE_KEY = 'sb_publishable_-f2M0WSqxpmUSmBFnkHYKg_xBt4FvAg'
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

const MAX_SEHIR = 3
const RENKLER = [
  '#1a5c3a', '#c45c26', '#2c6ebd', '#8b3a9e',
  '#b8860b', '#c62828', '#00838f', '#6a1b9a',
  '#558b2f', '#e65100'
]

let tumVeriler = []
let chartInstance = null
let seciliAralik = 'hafta'
let seciliSehirler = []
let seciliUrunler = []

// yanlis yazim -> dogru yazim
const URUN_ESLESMELER = {
  'avakado': 'avokado',
  'avacado': 'avokado'
}

// listede gorunecek dogru isim
const URUN_GOSTERIM = {
  'avokado': 'Avokado'
}

function normalizeUrun(ad) {
  let t = String(ad || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr')
  t = t.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim()
  if (URUN_ESLESMELER[t]) return URUN_ESLESMELER[t]
  return t
}

function guzelUrunAdi(ad) {
  const key = normalizeUrun(ad)
  if (URUN_GOSTERIM[key]) return URUN_GOSTERIM[key]

  const t = String(ad || '').trim().replace(/\s+/g, ' ')
  if (!t) return '—'
  if (t === t.toLocaleUpperCase('tr') && t.length > 1) {
    return t
      .toLocaleLowerCase('tr')
      .replace(/(^|[\s(/])(\S)/g, (_, a, b) => a + b.toLocaleUpperCase('tr'))
  }
  return t
}

async function verileriYukle() {
  const { data, error } = await sb
    .from('hal_fiyatlari')
    .select('*')
    .order('tarih', { ascending: false })
  if (error) {
    console.error('Supabase hatasi:', error)
    return null
  }
  return data || []
}

function fiyatSayi(str) {
  if (!str) return null
  const n = parseFloat(String(str).replace(',', '.').replace(/[^\d.]/g, ''))
  return isNaN(n) ? null : n
}

function benzersiz(liste) {
  return [...new Set(liste.filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'tr')
  )
}

function sehirleriDoldur() {
  const kutu = document.getElementById('ilBandiSatirlari')
  if (!kutu) return
  const sehirler = benzersiz(tumVeriler.map(v => v.sehir))
  if (!seciliSehirler.length) {
    seciliSehirler = sehirler.slice(0, Math.min(MAX_SEHIR, sehirler.length))
  }
  kutu.innerHTML = sehirler.map(s => {
    const checked = seciliSehirler.includes(s) ? 'checked' : ''
    return `<label class="il-secim-satir">
      <input type="checkbox" value="${s}" ${checked}> ${s}
    </label>`
  }).join('')

  kutu.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (seciliSehirler.length >= MAX_SEHIR) {
          cb.checked = false
          alert('En fazla ' + MAX_SEHIR + ' sehir secebilirsin.')
          return
        }
        seciliSehirler.push(cb.value)
      } else {
        seciliSehirler = seciliSehirler.filter(x => x !== cb.value)
      }
      sayaclariGuncelle()
      tabloyuDoldur()
      grafikCiz()
    })
  })
  sayaclariGuncelle()
}

function urunleriDoldur() {
  const kutu = document.getElementById('katalogListesi')
  if (!kutu) return

  const map = new Map()
  tumVeriler.forEach(v => {
    if (!v.urun_adi) return
    const key = normalizeUrun(v.urun_adi)
    if (!map.has(key)) map.set(key, v.urun_adi)
  })
  const urunKayitlari = [...map.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], 'tr')
  )

  kutu.innerHTML =
    '<input type="search" id="urunAra" placeholder="Urun ara..." style="margin-bottom:8px;width:100%;padding:8px 10px;border:1px solid #E1D9C4;border-radius:6px">' +
    '<div id="urunListeKutusu"></div>'

  const listeKutu = document.getElementById('urunListeKutusu')

  function ciz(filtre) {
    filtre = (filtre || '').toLocaleLowerCase('tr')
    const goster = urunKayitlari.filter(function (pair) {
      var key = pair[0]
      var orj = pair[1]
      return !filtre || key.indexOf(filtre) !== -1 ||
        orj.toLocaleLowerCase('tr').indexOf(filtre) !== -1
    })
    listeKutu.innerHTML = goster.slice(0, 100).map(function (pair) {
      var key = pair[0]
      var orj = pair[1]
      var checked = seciliUrunler.indexOf(key) !== -1 ? 'checked' : ''
      return '<label class="il-secim-satir">' +
        '<input type="checkbox" value="' + key + '" ' + checked + '> ' +
        guzelUrunAdi(orj) +
        '</label>'
    }).join('') || '<p>Urun yok</p>'

    listeKutu.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (cb.checked) {
          if (seciliUrunler.indexOf(cb.value) === -1) seciliUrunler.push(cb.value)
        } else {
          seciliUrunler = seciliUrunler.filter(function (x) { return x !== cb.value })
        }
        sayaclariGuncelle()
        tabloyuDoldur()
        grafikCiz()
      })
    })
  }

  document.getElementById('urunAra').addEventListener('input', function (e) {
    ciz(e.target.value)
  })
  ciz('')
  sayaclariGuncelle()
}

function sayaclariGuncelle() {
  var el = document.getElementById('illerSayisi')
  if (el) el.textContent = seciliSehirler.length ? '(' + seciliSehirler.length + ')' : ''
  var cip = document.getElementById('takipCipleri')
  if (cip) {
    var parcalar = seciliSehirler.map(function (s) {
      return '<span class="cip">' + s + '</span>'
    }).concat(seciliUrunler.map(function (u) {
      return '<span class="cip cip-urun">' + guzelUrunAdi(u) + '</span>'
    }))
    cip.innerHTML = parcalar.join('') || '<span class="cip-bos">Sehir ve urun sec</span>'
  }
}

function sehirBazliSonVeriler(kaynak) {
  var sonTarihMap = {}
  kaynak.forEach(function (v) {
    if (!v.sehir || !v.tarih) return
    var t = String(v.tarih).slice(0, 10)
    if (!sonTarihMap[v.sehir] || t > sonTarihMap[v.sehir]) sonTarihMap[v.sehir] = t
  })
  var sonuc = []
  var gorulen = {}
  var globalSon = null
  kaynak.forEach(function (v) {
    if (!v.sehir || !v.tarih) return
    var t = String(v.tarih).slice(0, 10)
    if (t !== sonTarihMap[v.sehir]) return
    var key = v.sehir + '|' + normalizeUrun(v.urun_adi)
    if (gorulen[key]) return
    gorulen[key] = true
    sonuc.push(v)
    if (!globalSon || t > globalSon) globalSon = t
  })
  sonuc.sort(function (a, b) {
    return normalizeUrun(a.urun_adi).localeCompare(normalizeUrun(b.urun_adi), 'tr')
  })
  return { liste: sonuc, sonTarih: globalSon }
}

function tabloyuDoldur() {
  var tbody = document.getElementById('priceTable')
  var updateTimeEl = document.getElementById('updateTime')
  var productCountEl = document.getElementById('productCount')
  if (!tbody) return

  var kaynak = tumVeriler
  if (seciliSehirler.length) {
    kaynak = kaynak.filter(function (v) { return seciliSehirler.indexOf(v.sehir) !== -1 })
  }
  if (seciliUrunler.length) {
    kaynak = kaynak.filter(function (v) {
      return seciliUrunler.indexOf(normalizeUrun(v.urun_adi)) !== -1
    })
  }

  var sonuc = sehirBazliSonVeriler(kaynak)
  var liste = sonuc.liste
  var sonTarih = sonuc.sonTarih

  tbody.innerHTML = ''
  if (!liste.length) {
    tbody.innerHTML = '<tr><td colspan="4">Secime uygun veri yok. Sehir / urun sec.</td></tr>'
    if (productCountEl) productCountEl.textContent = '0'
    return
  }

  liste.forEach(function (item) {
    var tr = document.createElement('tr')
    tr.innerHTML =
      '<td>' + guzelUrunAdi(item.urun_adi) + '</td>' +
      '<td>' + (item.sehir || '—') + '</td>' +
      '<td>' + (item.en_dusuk || '—') + ' ₺</td>' +
      '<td>' + (item.en_yuksek || '—') + ' ₺</td>'
    tbody.appendChild(tr)
  })

  if (productCountEl) productCountEl.textContent = liste.length
  if (updateTimeEl) {
    updateTimeEl.textContent = sonTarih
      ? new Date(sonTarih + 'T12:00:00').toLocaleDateString('tr-TR')
      : '—'
  }
}

function aralikBaslangic(aralik) {
  var bugun = new Date()
  bugun.setHours(23, 59, 59, 999)
  var bas = new Date(bugun)
  if (aralik === 'hafta') bas.setDate(bas.getDate() - 7)
  else if (aralik === 'ay') bas.setMonth(bas.getMonth() - 1)
  else if (aralik === 'yil') bas.setFullYear(bas.getFullYear() - 1)
  return bas.toISOString().slice(0, 10)
}

function grafikCiz() {
  var kutu = document.querySelector('.grafik-kutu')
  if (!kutu) return

  var sehirler = seciliSehirler.length
    ? seciliSehirler
    : benzersiz(tumVeriler.map(function (v) { return v.sehir })).slice(0, MAX_SEHIR)

  var urunler = seciliUrunler.slice()
  if (!urunler.length) {
    var map = {}
    tumVeriler.forEach(function (v) {
      if (!v.urun_adi) return
      map[normalizeUrun(v.urun_adi)] = true
    })
    urunler = Object.keys(map).slice(0, 3)
  }

  if (!sehirler.length || !urunler.length) {
    kutu.innerHTML = '<p class="grafik-bos">Grafik icin sehir ve urun sec</p>'
    return
  }

  var basStr = aralikBaslangic(seciliAralik)
  var filtreli = tumVeriler.filter(function (v) {
    return v.tarih &&
      String(v.tarih).slice(0, 10) >= basStr &&
      sehirler.indexOf(v.sehir) !== -1 &&
      urunler.indexOf(normalizeUrun(v.urun_adi)) !== -1
  })

  if (!filtreli.length) {
    kutu.innerHTML = '<p class="grafik-bos">Bu aralikta secili veri yok</p>'
    return
  }

  var seriMap = {}
  var tumTarihler = {}

  filtreli.forEach(function (item) {
    var t = String(item.tarih).slice(0, 10)
    var min = fiyatSayi(item.en_dusuk)
    var max = fiyatSayi(item.en_yuksek)
    if (min == null && max == null) return
    var ort = (min != null && max != null) ? (min + max) / 2 : (min != null ? min : max)
    var label = guzelUrunAdi(item.urun_adi) + ' · ' + item.sehir
    if (!seriMap[label]) seriMap[label] = {}
    seriMap[label][t] = ort
    tumTarihler[t] = true
  })

  var tarihler = Object.keys(tumTarihler).sort()
  var labels = Object.keys(seriMap).sort(function (a, b) {
    return a.localeCompare(b, 'tr')
  })

  kutu.innerHTML = '<canvas id="fiyatGrafik"></canvas>'
  var ctx = document.getElementById('fiyatGrafik')
  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: tarihler.map(function (t) {
        return new Date(t + 'T12:00:00').toLocaleDateString('tr-TR', {
          day: '2-digit', month: '2-digit'
        })
      }),
      datasets: labels.map(function (label, i) {
        return {
          label: label,
          data: tarihler.map(function (t) {
            return seriMap[label][t] != null ? seriMap[label][t] : null
          }),
          borderColor: RENKLER[i % RENKLER.length],
          backgroundColor: 'transparent',
          spanGaps: true,
          tension: 0.25,
          pointRadius: 2,
          borderWidth: 2
        }
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        y: {
          beginAtZero: false,
          ticks: { callback: function (v) { return v + ' ₺' } }
        }
      }
    }
  })
  ctx.parentElement.style.height = '320px'
}

function panelKur() {
  var eslesme = [
    ['illerBtn', 'illerPanel'],
    ['urunEkleBtn', 'urunEklePanel'],
    ['referansBtn', 'referansPanel']
  ]
  eslesme.forEach(function (pair) {
    var btn = document.getElementById(pair[0])
    var panel = document.getElementById(pair[1])
    if (!btn || !panel) return
    btn.addEventListener('click', function (e) {
      e.stopPropagation()
      var acik = panel.style.display === 'block'
      document.querySelectorAll('.dropdown-panel').forEach(function (p) {
        p.style.display = 'none'
      })
      panel.style.display = acik ? 'none' : 'block'
    })
  })
  document.addEventListener('click', function () {
    document.querySelectorAll('.dropdown-panel').forEach(function (p) {
      p.style.display = 'none'
    })
  })
  document.querySelectorAll('.dropdown-panel').forEach(function (p) {
    p.addEventListener('click', function (e) { e.stopPropagation() })
  })
}

async function yenile() {
  var tbody = document.getElementById('priceTable')
  if (tbody) tbody.innerHTML = '<tr><td colspan="4">Veriler yukleniyor...</td></tr>'

  tumVeriler = await verileriYukle()
  if (!tumVeriler) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="4">Veriler yuklenemedi.</td></tr>'
    return
  }

  sehirleriDoldur()
  urunleriDoldur()
  tabloyuDoldur()
  grafikCiz()
}

document.addEventListener('DOMContentLoaded', function () {
  panelKur()
  yenile()

  var zamanSecim = document.getElementById('zamanSecim')
  if (zamanSecim) {
    zamanSecim.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        zamanSecim.querySelectorAll('button').forEach(function (b) {
          b.classList.remove('active')
        })
        btn.classList.add('active')
        seciliAralik = btn.dataset.aralik || 'hafta'
        grafikCiz()
      })
    })
  }

  var updateBtn = document.getElementById('updateButton')
  if (updateBtn) updateBtn.addEventListener('click', function () { yenile() })

  var yasalAcBtn = document.getElementById('yasalAcBtn')
  var yasalModal = document.getElementById('yasalModal')
  var yasalAnladimBtn = document.getElementById('yasalAnladimBtn')
  if (yasalAcBtn && yasalModal) {
    yasalAcBtn.addEventListener('click', function () { yasalModal.style.display = 'flex' })
  }
  if (yasalAnladimBtn && yasalModal) {
    yasalAnladimBtn.addEventListener('click', function () { yasalModal.style.display = 'none' })
  }
  if (yasalModal) {
    yasalModal.addEventListener('click', function (e) {
      if (e.target === yasalModal) yasalModal.style.display = 'none'
    })
  }
})
