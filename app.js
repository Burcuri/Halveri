const SUPABASE_URL = 'https://dmhlysvzyxdgmtatshyc.supabase.co'
const SUPABASE_KEY = 'sb_publishable_-f2M0WSqxpmUSmBFnkHYKg_xBt4FvAg'
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

let tumVeriler = []
let chartInstance = null
let seciliAralik = 'hafta'

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

function enSonTarih(veriler) {
  if (!veriler.length) return null
  const tarihler = veriler
    .map(v => v.tarih)
    .filter(Boolean)
    .sort()
    .reverse()
  return tarihler[0] || null
}

// Son N gün içinde satır sayısı en yüksek olan günü seç
// Gece yarısı tek şehir yazsa bile önceki dolu günü gösterir
function enDoluGunuSec(tumVeriler, gunSayisi = 5) {
  if (!tumVeriler || tumVeriler.length === 0) return null

  const sayac = {}
  for (const v of tumVeriler) {
    if (!v.tarih) continue
    const t = String(v.tarih).slice(0, 10)
    sayac[t] = (sayac[t] || 0) + 1
  }

  const tarihler = Object.keys(sayac).sort().reverse()
  const adaylar = tarihler.slice(0, gunSayisi)
  if (adaylar.length === 0) return null

  let best = adaylar[0]
  let bestCount = sayac[best]
  for (const t of adaylar) {
    if (sayac[t] > bestCount) {
      best = t
      bestCount = sayac[t]
    }
  }
  return best
}

function tabloyuDoldur(veriler) {
  const tbody = document.getElementById('priceTable')
  const updateTimeEl = document.getElementById('updateTime')
  const productCountEl = document.getElementById('productCount')
  if (!tbody) return

  const sonTarih = enDoluGunuSec(veriler, 5)
  const gunluk = sonTarih
    ? veriler.filter(v => String(v.tarih).slice(0, 10) === sonTarih)
    : veriler

  const map = new Map()
  gunluk.forEach(item => {
    const key = `${item.sehir}|${item.urun_adi}`
    if (!map.has(key)) map.set(key, item)
  })
  const liste = Array.from(map.values()).sort((a, b) =>
    (a.urun_adi || '').localeCompare(b.urun_adi || '', 'tr')
  )

  tbody.innerHTML = ''
  if (!liste.length) {
    tbody.innerHTML = '<tr><td colspan="4">Henüz veri yok.</td></tr>'
    if (productCountEl) productCountEl.textContent = '0'
    return
  }

  liste.forEach(item => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${item.urun_adi || '—'}</td>
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
      : new Date().toLocaleString('tr-TR')
  }
}

function fiyatSayi(str) {
  if (!str) return null
  const n = parseFloat(String(str).replace(',', '.').replace(/[^\d.]/g, ''))
  return isNaN(n) ? null : n
}

function aralikFiltrele(veriler, aralik) {
  const bugun = new Date()
  bugun.setHours(23, 59, 59, 999)
  let baslangic = new Date(bugun)
  if (aralik === 'hafta') baslangic.setDate(baslangic.getDate() - 7)
  else if (aralik === 'ay') baslangic.setMonth(baslangic.getMonth() - 1)
  else if (aralik === 'yil') baslangic.setFullYear(baslangic.getFullYear() - 1)
  const basStr = baslangic.toISOString().slice(0, 10)
  return veriler.filter(v => v.tarih && v.tarih >= basStr)
}

function grafikCiz(veriler, aralik) {
  const kutu = document.querySelector('.grafik-kutu')
  if (!kutu) return

  const filtreli = aralikFiltrele(veriler, aralik)
  if (!filtreli.length) {
    kutu.innerHTML = '<p class="grafik-bos">Bu aralıkta veri yok</p>'
    return
  }

  const gunlukMap = {}
  filtreli.forEach(item => {
    const t = item.tarih
    const min = fiyatSayi(item.en_dusuk)
    const max = fiyatSayi(item.en_yuksek)
    if (min == null && max == null) return
    const ort = min != null && max != null ? (min + max) / 2 : (min ?? max)
    if (!gunlukMap[t]) gunlukMap[t] = { toplam: 0, adet: 0 }
    gunlukMap[t].toplam += ort
    gunlukMap[t].adet += 1
  })

  const tarihler = Object.keys(gunlukMap).sort()
  const ortalamalar = tarihler.map(t =>
    +(gunlukMap[t].toplam / gunlukMap[t].adet).toFixed(2)
  )

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
      datasets: [{
        label: 'Günlük ortalama fiyat (₺)',
        data: ortalamalar,
        borderColor: '#1a5c3a',
        backgroundColor: 'rgba(26, 92, 58, 0.12)',
        fill: true,
        tension: 0.25,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
  ctx.parentElement.style.height = '280px'
}

async function yenile() {
  const tbody = document.getElementById('priceTable')
  if (tbody) tbody.innerHTML = '<tr><td colspan="4">Veriler yükleniyor...</td></tr>'

  tumVeriler = await verileriYukle()
  if (!tumVeriler) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="4">Veriler yüklenemedi.</td></tr>'
    return
  }
  tabloyuDoldur(tumVeriler)
  grafikCiz(tumVeriler, seciliAralik)
}

document.addEventListener('DOMContentLoaded', () => {
  yenile()

  const zamanSecim = document.getElementById('zamanSecim')
  if (zamanSecim) {
    zamanSecim.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        zamanSecim.querySelectorAll('button').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        seciliAralik = btn.dataset.aralik || 'hafta'
        if (tumVeriler.length) grafikCiz(tumVeriler, seciliAralik)
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
