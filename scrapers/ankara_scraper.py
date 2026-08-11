import os
import sys
import time
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


def ankara_fiyat_cek(tarih_iso: str, deneme: int = 3) -> list:
    """
    tarih_iso: YYYY-MM-DD
    Ankara formu GG.AA.YYYY bekliyor.
    """
    gun, ay, yil = tarih_iso[8:10], tarih_iso[5:7], tarih_iso[0:4]
    tarih_tr = f"{gun}.{ay}.{yil}"

    tipler = {
        "fruit": "Meyve",
        "vegetable": "Sebze",
        "imported": "İthal",
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9",
        "Referer": "https://www.ankara.bel.tr/hal-fiyatlari",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://www.ankara.bel.tr",
    }

    veriler = []
    print(f"📡 Ankara çekiliyor... (tarih: {tarih_iso} / {tarih_tr})")

    for tip_kod, tip_adi in tipler.items():
        html = None
        for i in range(deneme):
            try:
                r = requests.post(
                    "https://www.ankara.bel.tr/hal-fiyatlari",
                    data={"date": tarih_tr, "type": tip_kod},
                    headers=headers,
                    timeout=30,
                )
                if r.status_code >= 500:
                    print(f"⚠️  {tip_adi} sunucu hatası {r.status_code}, deneme {i+1}/{deneme}...")
                    time.sleep(2)
                    continue
                r.raise_for_status()
                r.encoding = "utf-8"
                html = r.text
                break
            except Exception as e:
                print(f"❌ {tip_adi} istek hatası: {e} (deneme {i+1}/{deneme})")
                time.sleep(2)

        if not html:
            print(f"⚠️  {tip_adi} alınamadı, atlanıyor.")
            continue

        soup = BeautifulSoup(html, "html.parser")
        tablo = soup.find("table")
        if not tablo:
            print(f"⚠️  {tip_adi} için tablo yok.")
            continue

        sayac = 0
        for satir in tablo.find_all("tr")[1:]:
            sutunlar = satir.find_all("td")
            if len(sutunlar) < 5:
                continue

            urun_adi = sutunlar[0].get_text(strip=True)
            en_dusuk = sutunlar[3].get_text(strip=True)
            en_yuksek = sutunlar[4].get_text(strip=True)

            if not urun_adi:
                continue

            veriler.append({
                "sehir": "Ankara",
                "urun_adi": urun_adi,
                "en_dusuk": en_dusuk,
                "en_yuksek": en_yuksek,
                "tarih": tarih_iso,
            })
            sayac += 1

        print(f"✅ Ankara {tip_adi}: {sayac} ürün eklendi.")

    return veriler


def main():
    bugun = datetime.now()
    tarihler = [(bugun - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(5)]

    veriler = []
    kullanilan = None
    for t in tarihler:
        veriler = ankara_fiyat_cek(t)
        if veriler:
            kullanilan = t
            break
        print(f"⚠️  {t} boş, önceki gün deneniyor...")

    if not veriler:
        print("⚠️  Ankara için hiç veri bulunamadı.")
        sys.exit(0)  # workflow'u düşürmesin

    print(f"\n📦 Toplam {len(veriler)} Ankara ürünü yazılıyor... ({kullanilan})")

    try:
        sb = get_supabase_client()
        sb.table("hal_fiyatlari").upsert(
            veriler,
            on_conflict="urun_adi,sehir,tarih"
        ).execute()
        print(f"🎉 Ankara başarılı! {len(veriler)} ürün kaydedildi.")
    except Exception as e:
        print(f"❌ Supabase hatası: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
