import os
import sys
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ HATA: SUPABASE_URL veya SUPABASE_KEY secret'ı tanımlı değil!")
        sys.exit(1)
    
    return create_client(url, key)

def ibb_fiyatlarini_cek():
    hedef_url = "https://tarim.ibb.istanbul/avrupa-yakasi-hal-mudurlugu/hal-fiyatlari.html"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    
    print(f"📡 Siteye istek atılıyor: {hedef_url}")
    
    try:
        response = requests.get(hedef_url, headers=headers, timeout=30)
        response.raise_for_status()
        response.encoding = "utf-8"
    except requests.exceptions.Timeout:
        print("❌ Timeout: Site 30 saniyede cevap vermedi.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ İstek hatası: {e}")
        sys.exit(1)
    
    soup = BeautifulSoup(response.text, "html.parser")
    
    # Birden fazla tablo olabilir, hepsini dene
    tablolar = soup.find_all("table")
    veriler = []
    
    print(f"🔍 Sayfada {len(tablolar)} tablo bulundu.")
    
    for tablo in tablolar:
        satirlar = tablo.find_all("tr")
        for satir in satirlar[1:]:  # başlık satırını atla
            sutunlar = satir.find_all(["td", "th"])
            if len(sutunlar) >= 3:
                urun_adi = sutunlar[0].get_text(strip=True)
                en_dusuk = sutunlar[1].get_text(strip=True)
                en_yuksek = sutunlar[2].get_text(strip=True)
                
                if urun_adi and urun_adi.lower() not in ["ürün", "mal", "cinsi"]:
                    veriler.append({
                        "sehir": "İstanbul",
                        "urun_adi": urun_adi,
                        "en_dusuk": en_dusuk,
                        "en_yuksek": en_yuksek,
                        "tarih": datetime.now().strftime("%Y-%m-%d"),
                        "kaynak": "İBB Avrupa Yakası"
                    })
    
    if not veriler:
        print("⚠️  Hiç veri bulunamadı. Site yapısı değişmiş olabilir.")
        # Debug için sayfanın bir kısmını yazdır
        print("Sayfa başlığı:", soup.title.string if soup.title else "Yok")
        sys.exit(1)
    
    print(f"✅ {len(veriler)} ürün bulundu. Supabase'e yazılıyor...")
    
    try:
        supabase = get_supabase_client()
        # upsert için unique constraint'in (urun_adi + tarih veya sehir+urun_adi) olduğundan emin ol
        result = supabase.table("hal_fiyatlari").upsert(veriler).execute()
        print(f"🎉 Başarılı! {len(veriler)} ürün kaydedildi.")
    except Exception as e:
        print(f"❌ Supabase hatası: {e}")
        sys.exit(1)

if __name__ == "__main__":
    ibb_fiyatlarini_cek()
