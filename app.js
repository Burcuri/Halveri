const SUPABASE_URL = 'https://dmhlysvzyxdgmtatshyc.supabase.co'
const SUPABASE_KEY = 'sb_publishable_-f2M0WSqxpmUSmBFnkHYKg_xBt4FvAg'
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

async function halFiyatlariniGetir() {
  const tabloGovdesi = document.getElementById('priceTable')
  const updateTimeEl = document.getElementById('updateTime')
  const productCountEl = document.getElementById('productCount')
  const grafikKutu = document.querySelector('.grafik-kutu')

  if (!tabloGovdesi) return

  tabloGovdesi.innerHTML = '<tr><td colspan="4">Veriler yükleniyor...</td></tr>'

  const { data, error } = await sb
    .from('hal_fiyatlari')
    .select('*')
    .order('urun_adi', { ascending: true })

  if (error) {
    console.error('Supabase hatası:', error)
    tabloGovdesi.innerHTML = '<tr><td colspan="4">Veriler yüklenemedi.</td></tr>'
    if (grafikKutu) grafikKutu.innerHTML = '<p class="grafik-bos">Veri yüklenemedi</p>'
    return
  }

  if (!data || data.length === 0) {
    tabloGovdesi.innerHTML = '<tr><td colspan="4">Henüz veri yok.</td></tr>'
    if (productCountEl) productCountEl.textContent = '0'
    if (grafikKutu) grafikKutu.innerHTML = '<p class="grafik-bos">Veri yok</p>'
    return
  }

  tabloGovdesi.innerHTML = ''
  data.forEach(item => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${item.urun_adi || '—'}</td>
      <td>${item.sehir || '—'}</td>
      <td>${item.en_dusuk || '—'} ₺</td>
      <td>${item.en_yuksek || '—'} ₺</td>
    `
    tabloGovdesi.appendChild(tr)
  })

  if (productCountEl) productCountEl.textContent = data.length
  if (updateTimeEl) {
    updateTimeEl.textContent = new Date().toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (grafikKutu) {
    grafikKutu.innerHTML = `<p class="grafik-bos">${data.length} ürün listelendi</p>`
  }
}

document.addEventListener('DOMContentLoaded', () => {
  halFiyatlariniGetir()

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
    yasalModal.addEventListener('click', (e) => {
      if (e.target === yasalModal) yasalModal.style.display = 'none'
    })
  }

  const updateBtn = document.getElementById('updateButton')
  if (updateBtn) {
    updateBtn.addEventListener('click', () => halFiyatlariniGetir())
  }
})
