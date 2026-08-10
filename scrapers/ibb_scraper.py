import os
import sys
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime, timedelta

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

    if not url or not key:
        print("❌ SUPABASE_URL veya SUPABASE_KEY bulunamadı!")
        sys.exit(1)

    return create_client(url, key)

def fiyat_cek(tarih: str, headers: dict) -> list:
    kategoriler = {
        "5": "Meyve",
        "6": "Sebze",
        "7": "İthal Ürünler"
    }
    veriler = []

    for kategori_id, kategori_adi in kategoriler.items():
        print(f"📡 {kategori_adi} çekiliyor... (tarih: {tarih})")

        params = {
            "tarih": tarih,
            "kategori": kategori_id,
            "tUsr": "M3yV353bZe",
            "tPas": "LA74sBcXERpdBaz",
            "tVal": "881f3dc3-7d08-40db-b45a-1275c0245685",
            "HalTurId": "2"
        }

        try:
            response = requests.get(
                "https://tarim.ibb.istanbul/inc/halfiyatlari/gunluk_fiyatlar.asp",
                params=params,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            response.encoding = "utf-8"
        except Exception as e:
            print(f"❌ {kategori_adi} isteği başarısız: {e}")
            continue

        soup = BeautifulSoup(response.text, "html.parser")
        tablo = soup.find("table")

        if not tablo:
            print(f"⚠️  {kategori_adi} için tablo bulunamadı.")
            continue

        satirlar = tablo.find_all("tr")[1:]
        sayac = 0
        for satir in satirlar:
            sutunlar = satir.find_all("td")
            if len(sutunlar) >= 4:
                urun_adi = sutunlar[0].get_text(strip=True)
                en_dusuk = sutunlar[2].get_text(strip=True).replace("TL", "").strip()
                en_yuksek = sutunlar[3].get_text(strip=True).replace("TL", "").strip()

                if urun_adi:
                    veriler.append({
                        "sehir": "İstanbul",
                        "urun_adi": urun_adi,
                        "en_dusuk": en_dusuk,
                        "en_yuksek": en_yuksek,
                        "tarih": tarih
                    })
                    sayac += 1

        print(f"✅ {kategori_adi}: {sayac} ürün eklendi.")

    return veriler

def ibb_fiyatlarini_cek():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9",
    }

        bugun = datetime.now()
    # Son 5 güne bak (erken saat / tatil / hafta sonu için)
    tarihler = [(bugun - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(5)]

    veriler = []
    kullanilan_tarih = None
    for t in tarihler:
        veriler = fiyat_cek(t, headers)
        if veriler:
            kullanilan_tarih = t
            break
        print(f"⚠️  {t} boş, önceki gün deneniyor...")

    if not veriler:
        print("⚠️  Hiç veri bulunamadı.")
        sys.exit(1)

    print(f"\n📦 Toplam {len(veriler)} ürün Supabase'e yazılıyor... (tarih: {kullanilan_tarih})")

    try:
        supabase = get_supabase_client()
        # urun_adi + sehir + tarih çakışırsa güncelle, eski günler kalsın
        supabase.table("hal_fiyatlari").upsert(
            veriler,
            on_conflict="urun_adi,sehir,tarih"
        ).execute()
        print(f"🎉 Başarılı! {len(veriler)} ürün kaydedildi. ({kullanilan_tarih})")
    except Exception as e:
        print(f"❌ Supabase hatası: {e}")
        sys.exit(1)

if __name__ == "__main__":
    ibb_fiyatlarini_cek()
