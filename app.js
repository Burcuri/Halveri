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
let seciliUrunler = [] // normalize edilmiş isimler

function normalizeUrun(ad) {
  return String(ad || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr')
}

function guzelUrunAdi(ad) {
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
    console.error('Supabase hatası:', error)
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
          alert(`En fazla ${MAX_SEHIR} şehir seçebilirsin.`)
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

  // Aynı ürün (avokado / AVOKADO) tek satır
  const map = new Map()
  tumVeriler.forEach(v => {
    if (!v.urun_adi) return
    const key = normalizeUrun(v.urun_adi)
    if (!map.has(key)) map.set(key, v.urun_adi)
  })
  const urunKayitlari = [...map.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], 'tr')
  )

  kutu.innerHTML = `
    <input type="search" id="urunAra" placeholder="Ürün ara..." class="form-control" style="margin-bottom:8px;width:100%">
    <div id="urunListeKutusu"></div>
  `
  const listeKutu = document.getElementById('urunListeKutusu')

  function ciz(filtre = '') {
    const f = filtre.toLocaleLowerCase('tr')
    const goster = urunKayitlari.filter(([key, orj]) =>
      !f || key.includes(f) || orj.toLocaleLowerCase('tr').includes(f)
    )
    listeKutu.innerHTML = goster.slice(0, 100).map(([key, orj]) => {
      const checked = seciliUrunler.includes(key) ? 'checked' : ''
      return `<label class="il-secim-satir">
        <input type="checkbox" value="${key}" ${checked}> ${guzelUrunAdi(orj)}
      </label>`
    }).join('') || '<p>Ürün yok</p>'

    listeKutu.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!seciliUrunler.includes(cb.value)) seciliUrunler.push(cb.value)
        } else {
          seciliUrunler = seciliUrunler.filter(x => x !== cb.value)
        }
        sayaclariGuncelle()
        tabloyuDoldur()
        grafikCiz()
      })
    })
  }

  document.getElementById('urunAra').addEventListener('input', e => ciz(e.target.value))
  ciz()
  sayaclariGuncelle()
}

function sayaclariGuncelle() {
  const el = document.getElementById('illerSayisi')
  if (el) el.textContent = seciliSehirler.length ? `(${seciliSehirler.length})` : ''
  const cip = document.getElementById('takipCipleri')
  if (cip) {
    const parcalar = [
      ...seciliSehirler.map(s => `<span class="cip">${s}</span>`),
      ...seciliUrunler.map(u => `<span class="cip cip-urun">${guzelUrunAdi(u)}</span>`)
    ]
    cip.innerHTML = parcalar.join('') || '<span class="cip-bos">Şehir ve ürün seç</span>'
  }
}

function sehirBazliSonVeriler(kaynak) {
  const sonTarihMap = {}
  for (const v of kaynak) {
    if (!v.sehir || !v.tarih) continue
    const t = String(v.tarih).slice(0, 10)
    if (!sonTarihMap[v.sehir] || t > sonTarihMap[v.sehir]) sonTarihMap[v.sehir] = t
  }
  const sonuc = []
  const gorulen = new Set()
  let globalSon = null
  for (const v of kaynak) {
    if (!v.sehir || !v.tarih) continue
    const t = String(v.tarih).slice(0, 10)
    if (t !== sonTarihMap[v.sehir]) continue
    const key = `${v.sehir}|${normalizeUrun(v.urun_adi)}`
    if (gorulen.has(key)) continue
    gorulen.add(key)
    sonuc.push(v)
    if (!globalSon || t > globalSon) globalSon = t
  }
  sonuc.sort((a, b) =>
    normalizeUrun(a.urun_adi).localeCompare(normalizeUrun(b.urun_adi), 'tr')
  )
  return { liste: sonuc, sonTarih: globalSon }
}

function tabloyuDoldur() {
  const tbody = document.getElementById('priceTable')
  const updateTimeEl = document.getElementById('updateTime')
  const productCountEl = document.getElementById('productCount')
  if (!tbody) return

  let kaynak = tumVeriler
  if (seciliSehirler.length) {
    kaynak = kaynak.filter(v => seciliSehirler.includes(v.sehir))
  }
  if (seciliUrunler.length) {
    kaynak = kaynak.filter(v => seciliUrunler.includes(normalizeUrun(v.urun_adi)))
  }

  const { liste, sonTarih } = sehirBazliSonVeriler(kaynak)

  tbody.innerHTML = ''
  if (!liste.length) {
    tbody.innerHTML = '<tr><td colspan="4">Seçime uygun veri yok. Şehir / ürün seç.</td></tr>'
    if (productCountEl) productCountEl.textContent = '0'
    return
  }

  liste.forEach(item => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${guzelUrunAdi(item.urun_adi)}</td>
      <td>${item.sehir || '—'}</td>
      <td>${item.en_dusuk || '—'} ₺</td>
      <td>${item.en_yuksek || '—'} ₺</td>
    `
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
  const bugun = new Date()
  bugun.setHours(23, 59, 59, 999)
  const bas = new Date(bugun)
  if (aralik === 'hafta') bas.setDate(bas.getDate() - 7)
  else if (aralik === 'ay') bas.setMonth(bas.getMonth() - 1)
  else if (aralik === 'yil') bas.setFullYear(bas.getFullYear() - 1)
  return bas.toISOString().slice(0, 10)
}

function grafikCiz() {
  const kutu = document.querySelector('.grafik-kutu')
  if (!kutu) return

  const sehirler = seciliSehirler.length
    ? seciliSehirler
    : benzersiz(tumVeriler.map(v => v.sehir)).slice(0, MAX_SEHIR)

  let urunler = seciliUrunler.slice()
  if (!urunler.length) {
    const map = new Map()
    tumVeriler.forEach(v => {
      if (!v.urun_adi) return
      const key = normalizeUrun(v.urun_adi)
      if (!map.has(key)) map.set(key, v.urun_adi)
    })
    urunler = [...map.keys()].slice(0, 3)
  }

  if (!sehirler.length || !urunler.length) {
    kutu.innerHTML = '<p class="grafik-bos">Grafik için şehir ve ürün seç</p>'
    return
  }

  const basStr = aralikBaslangic(seciliAralik)
  const filtreli = tumVeriler.filter(v =>
    v.tarih &&
    String(v.tarih).slice(0, 10) >= basStr &&
    sehirler.includes(v.sehir) &&
    urunler.includes(normalizeUrun(v.urun_adi))
  )

  if (!filtreli.length) {
    kutu.innerHTML = '<p class="grafik-bos">Bu aralıkta seçili veri yok</p>'
    return
  }

  const seriMap = {}
  const tumTarihler = new Set()

  filtreli.forEach(item => {
    const t = String(item.tarih).slice(0, 10)
    const min = fiyatSayi(item.en_dusuk)
    const max = fiyatSayi(item.en_yuksek)
    if (min == null && max == null) return
    const ort = min != null && max != null ? (min + max) / 2 : (min ?? max)
    const label = `${guzelUrunAdi(item.urun_adi)} · ${item.sehir}`
    if (!seriMap[label]) seriMap[label] = {}
    seriMap[label][t] = ort
    tumTarihler.add(t)
  })

  const tarihler = [...tumTarihler].sort()
  const labels = Object.keys(seriMap).sort((a, b) => a.localeCompare(b, 'tr'))

  kutu.innerHTML = '<canvas id="fiyatGrafik"></canvas>'
  const ctx = document.getElementById('fiyatGrafik')
  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: tarihler.map(t =>
        new Date(t + 'T12:00:00').toLocaleDateString('tr-TR', {
          day: '2-digit', month: '2-digit'
        })
      ),
      datasets: labels.map((label, i) => ({
        label,
        data: tarihler.map(t => seriMap[label][t] ?? null),
        borderColor: RENKLER[i % RENKLER.length],
        backgroundColor: 'transparent',
        spanGaps: true,
        tension: 0.25,
        pointRadius: 2,
        borderWidth: 2
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: true, position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: { callback: v => v + ' ₺' }
        }
      }
    }
  })
  ctx.parentElement.style.height = '320px'
}

function panelKur() {
  const eslesme = [
    ['illerBtn', 'illerPanel'],
    ['urunEkleBtn', 'urunEklePanel'],
    ['referansBtn', 'referansPanel']
  ]
  eslesme.forEach(([btnId, panelId]) => {
    const btn = document.getElementById(btnId)
    const panel = document.getElementById(panelId)
    if (!btn || !panel) return
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const acik = panel.style.display === 'block'
      document.querySelectorAll('.dropdown-panel').forEach(p => { p.style.display = 'none' })
      panel.style.display = acik ? 'none' : 'block'
    })
  })
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-panel').forEach(p => { p.style.display = 'none' })
  })
  document.querySelectorAll('.dropdown-panel').forEach(p => {
    p.addEventListener('click', e => e.stopPropagation())
  })
}

async function yenile() {
  const tbody = document.getElementById('priceTable')
  if (tbody) tbody.innerHTML = '<tr><td colspan="4">Veriler yükleniyor...</td></tr>'

  tumVeriler = await verileriYukle()
  if (!tumVeriler) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="4">Veriler yüklenemedi.</td></tr>'
    return
  }

  sehirleriDoldur()
  urunleriDoldur()
  tabloyuDoldur()
  grafikCiz()
}

document.addEventListener('DOMContentLoaded', () => {
  panelKur()
  yenile()

  const zamanSecim = document.getElementById('zamanSecim')
  if (zamanSecim) {
    zamanSecim.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        zamanSecim.querySelectorAll('button').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        seciliAralik = btn.dataset.aralik || 'hafta'
        grafikCiz()
      })
    })
  }

  const updateBtn = document.getElementById('updateButton')
  if (updateBtn) updateBtn.addEventListener('click', () => yenile())

  const yasalAcBtn = document.getElementById('yasalAcBtn')
  const yasalModal = document.getElementById('yasalModal')
  const yasalAnladimBtn = document.getElementById('yasalAnladimBtn')
  if (yasalAcBtn && yasalModal) {
    yasalAcBtn.addEventListener('click', () => { yasalModal.style.display = 'flex' })
  }
  if (yasalAnladimBtn && yasalModal) {
    yasalAnladimBtn.addEventListener('click', () => { yasalModal.style.display = 'none' })
  }
  if (yasalModal) {
    yasalModal.addEventListener('click', e => {
      if (e.target === yasalModal) yasalModal.style.display = 'none'
    })
  }
})
