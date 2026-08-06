import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Senin Supabase proje bilgilerin
const supabaseUrl = 'https://dmhlysvzyxdgmtatshyc.supabase.co'
const supabaseKey = 'sb_publishable_-f2M0WSqxpmUSmBFnkHYKg_xBt4FvAg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function halFiyatlariniGetir() {
    // HTML'de verileri yazdıracağın tablo gövdesi
    const tabloGovdesi = document.getElementById('priceTable');
    
    if(!tabloGovdesi) return;
    
    tabloGovdesi.innerHTML = '<tr><td colspan="4">Veriler yükleniyor...</td></tr>';

    // Supabase'den verileri çek
    const { data, error } = await supabase
        .from('hal_fiyatlari')
        .select('*')
        .order('urun_adi', { ascending: true }); // A'dan Z'ye sırala
        
    if (error) {
        console.error("Veritabanından veri çekilirken hata oluştu:", error);
        tabloGovdesi.innerHTML = '<tr><td colspan="4">Veriler yüklenemedi.</td></tr>';
        return;
    }

    // Tabloyu temizle ve gelen verilerle doldur
    tabloGovdesi.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.sehir}</td>
            <td>${item.urun_adi}</td>
            <td>${item.en_dusuk} ₺</td>
            <td>${item.en_yuksek} ₺</td>
        `;
        tabloGovdesi.appendChild(tr);
    });
}

// Sayfa yüklendiğinde fonksiyonu çalıştır
document.addEventListener('DOMContentLoaded', halFiyatlariniGetir);
