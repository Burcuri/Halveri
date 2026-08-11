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


def format_fiyat(text: str) -> str:
    """'50' / '50.00' / '50,00' -> '50,00'"""
    if not text:
        return ""
    t = text.replace("₺", "").replace("TL", "").replace(" ", "").strip()
    t = t.replace(".", ",")
    if not t:
        return ""
    if "," not in t:
        # sadece tam sayı
        if t.isdigit():
            return f"{t},00"
    return t


def sifir_mi(f: str) -> bool:
    if not f:
        return True
    try:
        return float(f.replace(",", ".")) == 0.0
    except ValueError:
        return True


def konya_fiyat_cek(tarih_iso: str, deneme: int = 3) -> list:
    url = "https://www.konya.bel.tr/hal-fiyatlari"
    params = {"tarih": tarih_iso}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    html = None
    for i in range(deneme):
        try:
            print(f"📡 Konya çekiliyor... (tarih: {tarih_iso}) deneme {i+1}/{deneme}")
            r = requests.get(url, params=params, headers=headers, timeout=30)
            if r.status_code >= 500:
                print(f"⚠️  Sunucu {r.status_code}, tekrar / atlanıyor...")
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
        for satir in tablo.find_all("tr"):
            sutunlar = satir.find_all("td")
            if len(sutunlar) < 4:
                continue

            urun_adi = sutunlar[0].get_text(strip=True)
            # Başlık satırlarını atla
            if not urun_adi or urun_adi.upper() in ("ÜRÜN", "ÜRÜN ADI", "SEBZE FİYATLARI", "MEYVE FİYATLARI"):
                continue

            en_dusuk = format_fiyat(sutunlar[2].get_text(strip=True))
            en_yuksek = format_fiyat(sutunlar[3].get_text(strip=True))

            if sifir_mi(en_dusuk) and sifir_mi(en_yuksek):
                continue

            key = urun_adi.casefold()
            if key in gorulen:
                continue
            gorulen.add(key)

            veriler.append({
                "sehir": "Konya",
                "urun_adi": urun_adi,
                "en_dusuk": en_dusuk,
                "en_yuksek": en_yuksek,
                "tarih": tarih_iso,
            })

    print(f"✅ Konya: {len(veriler)} ürün")
    return veriler


def main():
    bugun = datetime.now()
    # Son 7 gün (Konya bazı günlerde 500 verebiliyor)
    tarihler = [(bugun - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]

    veriler = []
    kullanilan = None
    for t in tarihler:
        veriler = konya_fiyat_cek(t)
        if veriler:
            kullanilan = t
            break
        print(f"⚠️  {t} boş, önceki gün deneniyor...")

    if not veriler:
        print("⚠️  Konya için veri yok.")
        sys.exit(0)

    print(f"\n📦 {len(veriler)} Konya ürünü yazılıyor... ({kullanilan})")

    try:
        sb = get_supabase_client()
        sb.table("hal_fiyatlari").upsert(
            veriler,
            on_conflict="urun_adi,sehir,tarih"
        ).execute()
        print(f"🎉 Konya başarılı! {len(veriler)} ürün kaydedildi.")
    except Exception as e:
        print(f"❌ Supabase hatası: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
