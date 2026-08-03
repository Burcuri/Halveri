import requests
from bs4 import BeautifulSoup
import os
from supabase import create_client, Client

# Supabase ayarları (Bu bilgileri GitHub Actions'tan alacak)
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def ibb_fiyatlarini_cek():
    hedef_url = "https://tarim.ibb.istanbul/avrupa-yakasi-hal-mudurlugu/hal-fiyatlari.html"
    response = requests.get(hedef_url)
    
    # Türkçe karakter sorunu yaşamamak için encoding ayarı
    response.encoding = 'utf-8'
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Sitedeki tabloyu bul (İBB'nin HTML yapısına göre)
    tablo = soup.find('table')
    veriler = []
    
    if tablo:
        satirlar = tablo.find_all('tr')[1:] # İlk satır başlık olduğu için atlıyoruz
        for satir in satirlar:
            sutunlar = satir.find_all('td')
            if len(sutunlar) >= 3:
                urun_adi = sutunlar[0].text.strip()
                en_dusuk = sutunlar[1].text.strip()
                en_yuksek = sutunlar[2].text.strip()
                
                veriler.append({
                    "sehir": "İstanbul",
                    "urun_adi": urun_adi,
                    "en_dusuk": en_dusuk,
                    "en_yuksek": en_yuksek
                })
                
    if veriler:
        # Supabase'deki 'hal_fiyatlari' adlı tabloya verileri ekle/güncelle
        supabase.table("hal_fiyatlari").upsert(veriler).execute()
        print(f"Başarılı! {len(veriler)} ürün Supabase'e kaydedildi.")
    else:
        print("Veri bulunamadı veya site yapısı değişmiş.")

if __name__ == "__main__":
    ibb_fiyatlarini_cek()
