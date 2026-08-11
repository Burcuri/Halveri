// Her şehir için kendi en son tarihini al, hepsini birleştir
function sehirBazliSonVeriler(tumVeriler) {
  if (!tumVeriler || !tumVeriler.length) return { liste: [], sonTarih: null }

  // sehir -> en son tarih
  const sonTarihMap = {}
  for (const v of tumVeriler) {
    if (!v.sehir || !v.tarih) continue
    const t = String(v.tarih).slice(0, 10)
    if (!sonTarihMap[v.sehir] || t > sonTarihMap[v.sehir]) {
      sonTarihMap[v.sehir] = t
    }
  }

  const sonuc = []
  const gorulen = new Set()
  let globalSon = null

  for (const v of tumVeriler) {
    if (!v.sehir || !v.tarih) continue
    const t = String(v.tarih).slice(0, 10)
    if (t !== sonTarihMap[v.sehir]) continue

    const key = `${v.sehir}|${v.urun_adi}`
    if (gorulen.has(key)) continue
    gorulen.add(key)
    sonuc.push(v)

    if (!globalSon || t > globalSon) globalSon = t
  }

  sonuc.sort((a, b) => (a.urun_adi || '').localeCompare(b.urun_adi || '', 'tr'))
  return { liste: sonuc, sonTarih: globalSon }
}

function tabloyuDoldur(veriler) {
  const tbody = document.getElementById('priceTable')
  const updateTimeEl = document.getElementById('updateTime')
  const productCountEl = document.getElementById('productCount')
  if (!tbody) return

  const { liste, sonTarih } = sehirBazliSonVeriler(veriler)

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
