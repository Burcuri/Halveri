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


def temiz_fiyat(text: str) -> str:
    """'60.00 ₺' / '60,00 TL' -> '60,00'  (İstanbul/İzmir formatına yakın)"""
    if not text:
        return ""
    t = text.replace("₺", "").replace("TL", "").replace(" ", "").strip()
    # 60.00 -> 60,00
    t = t.replace(".", ",")
    return t


def sifir_mi(fiyat: str) -> bool:
    if not fiyat:
        return True
    n = fiyat.replace(",", ".").replace(" ", "")
    try:
        return float(n) == 0.0
    except ValueError:
        return True


def adana_fiyat_cek(deneme: int = 3) -> tuple[list, str]:
    """
    biadana.com güncel Adana listesini çeker.
    Dönüş: (veriler, tarih_iso)
    """
    url = "https://www.biadana.com/hal-fiyatlari"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    html = None
    for i in range(deneme):
        try:
            print(f"📡 Adana (biadana) çekiliyor... deneme {i+1}/{deneme}")
            r = requests.get(url, headers=headers, timeout=30)
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
        return [], None

    # Sayfadaki tarihi bul (ör. 11.08.2026 veya 11 Ağustos 2026)
    tarih_iso = None
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", html)
    if m:
        gun, ay, yil = m.group(1).zfill(2), m.group(2).zfill(2), m.group(3)
        tarih_iso = f"{yil}-{ay}-{gun}"
    else:
        tarih_iso = datetime.now().strftime("%Y-%m-%d")

    soup = BeautifulSoup(html, "html.parser")
    tablo = soup.find("table")
    if not tablo:
        print("⚠️  Tablo bulunamadı.")
        return [], tarih_iso

    veriler = []
    for satir in tablo.find_all("tr")[1:]:
        sutunlar = satir.find_all("td")
        if len(sutunlar) < 4:
            continue

        urun_adi = sutunlar[0].get_text(strip=True)
        en_dusuk = temiz_fiyat(sutunlar[2].get_text(strip=True))
        en_yuksek = temiz_fiyat(sutunlar[3].get_text(strip=True))

        if not urun_adi:
            continue
        # 0,00 fiyatlı boş kayıtları atla
        if sifir_mi(en_dusuk) and sifir_mi(en_yuksek):
            continue

        veriler.append({
            "sehir": "Adana",
            "urun_adi": urun_adi,
            "en_dusuk": en_dusuk,
            "en_yuksek": en_yuksek,
            "tarih": tarih_iso,
        })

    print(f"✅ Adana: {len(veriler)} ürün (tarih: {tarih_iso})")
    return veriler, tarih_iso


def main():
    veriler, tarih = adana_fiyat_cek()

    if not veriler:
        print("⚠️  Adana için veri yok.")
        sys.exit(0)

    print(f"\n📦 {len(veriler)} Adana ürünü yazılıyor... ({tarih})")

    try:
        sb = get_supabase_client()
        sb.table("hal_fiyatlari").upsert(
            veriler,
            on_conflict="urun_adi,sehir,tarih"
        ).execute()
        print(f"🎉 Adana başarılı! {len(veriler)} ürün kaydedildi.")
    except Exception as e:
        print(f"❌ Supabase hatası: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
