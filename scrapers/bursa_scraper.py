import os
import sys
import re
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


def parse_fiyat_araligi(text: str) -> tuple[str, str]:
    """
    '100,00 - 300,00 ₺' / '100,00-300,00₺' -> ('100,00', '300,00')
    """
    if not text:
        return "", ""
    t = text.replace("₺", "").replace("TL", "").replace(" ", "")
    m = re.search(r"([\d]+[.,][\d]+)\s*[-–]\s*([\d]+[.,][\d]+)", t)
    if m:
        return m.group(1).replace(".", ","), m.group(2).replace(".", ",")
    # tek fiyat varsa ikisine de yaz
    m2 = re.search(r"([\d]+[.,][\d]+)", t)
    if m2:
        f = m2.group(1).replace(".", ",")
        return f, f
    return "", ""


def sifir_mi(f: str) -> bool:
    if not f:
        return True
    try:
        return float(f.replace(",", ".")) == 0.0
    except ValueError:
        return True


def bursa_fiyat_cek(tarih_iso: str, deneme: int = 3) -> list:
    url = "https://www.bursa.bel.tr/hal_fiyatlari"
    params = {"sayfa": "hal_fiyatlari", "tarih": tarih_iso}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9",
    }

    html = None
    for i in range(deneme):
        try:
            print(f"📡 Bursa çekiliyor... (tarih: {tarih_iso}) deneme {i+1}/{deneme}")
            r = requests.get(url, params=params, headers=headers, timeout=30)
            if r.status_code >= 500:
                print(f"⚠️  Sunucu {r.status_code}, tekrar...")
                time.sleep(2)
                continue
            r.raise_for_status()
            r.encoding = "utf-8"
            html = r.text
            break
        except Exception as e:
            print(f"❌ İstek hatası: {e}")
            time.sleep(2)

    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    tablolar = soup.find_all("table")
    if not tablolar:
        print("⚠️  Tablo yok.")
        return []

    veriler = []
    gorulen = set()

    for tablo in tablolar:
        for satir in tablo.find_all("tr")[1:]:
            sutunlar = satir.find_all("td")
            if len(sutunlar) < 3:
                continue

            urun_adi = sutunlar[0].get_text(strip=True)
            fiyat_ham = sutunlar[2].get_text(strip=True)
            en_dusuk, en_yuksek = parse_fiyat_araligi(fiyat_ham)

            if not urun_adi:
                continue
            if sifir_mi(en_dusuk) and sifir_mi(en_yuksek):
                continue

            key = (urun_adi.lower(), tarih_iso)
            if key in gorulen:
                continue
            gorulen.add(key)

            veriler.append({
                "sehir": "Bursa",
                "urun_adi": urun_adi,
                "en_dusuk": en_dusuk,
                "en_yuksek": en_yuksek,
                "tarih": tarih_iso,
            })

    print(f"✅ Bursa: {len(veriler)} ürün")
    return veriler


def main():
    bugun = datetime.now()
    tarihler = [(bugun - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(5)]

    veriler = []
    kullanilan = None
    for t in tarihler:
        veriler = bursa_fiyat_cek(t)
        if veriler:
            kullanilan = t
            break
        print(f"⚠️  {t} boş, önceki gün deneniyor...")

    if not veriler:
        print("⚠️  Bursa için veri yok.")
        sys.exit(0)

    print(f"\n📦 {len(veriler)} Bursa ürünü yazılıyor... ({kullanilan})")

    try:
        sb = get_supabase_client()
        sb.table("hal_fiyatlari").upsert(
            veriler,
            on_conflict="urun_adi,sehir,tarih"
        ).execute()
        print(f"🎉 Bursa başarılı! {len(veriler)} ürün kaydedildi.")
    except Exception as e:
        print(f"❌ Supabase hatası: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
