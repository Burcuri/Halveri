"""
İzmir Büyükşehir Belediyesi E-İşlem Merkezi'nden günlük sebze/meyve
hal fiyatlarını çeker ve DOĞRUDAN Supabase'e yazar.

Bu, GitHub Actions ile her gün otomatik çalışacak sürüm — CSV ara
adımı yok, elle bir şey yüklemene gerek yok.

Kaynak: https://eislem.izmir.bel.tr/tr/HalFiyatlari/20/2

Ortam değişkenleri (GitHub Actions secrets üzerinden gelecek):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY   (anon key DEĞİL — yazma yetkisi olan secret key)
"""

import os
import sys
import time
from datetime import date, datetime, timedelta

import requests
from bs4 import BeautifulSoup
from supabase import create_client

BASE_URL = "https://eislem.izmir.bel.tr/tr/HalFiyatlari/20/2"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
}


def gun_verisini_cek(gun: date) -> list[dict]:
    params = {"date": gun.strftime("%Y-%m-%d"), "tip": 0, "aranacak": ""}
    resp = requests.get(BASE_URL, params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    table = None
    for t in soup.find_all("table"):
        if "Adı" in t.get_text() and "En Az" in t.get_text():
            table = t
            break
    if table is None:
        return []

    def sayiya_cevir(deger):
        deger = deger.replace("TL", "").replace(".", "").replace(",", ".").strip()
        try:
            return float(deger)
        except ValueError:
            return None

    satirlar = []
    for tr in table.find_all("tr"):
        hucreler = [td.get_text(strip=True) for td in tr.find_all("td")]
        if len(hucreler) < 6:
            continue
        tip, ad, birim, en_az, en_cok, ortalama = hucreler[:6]
        if ad in ("", "Adı"):
            continue
        min_f, max_f = sayiya_cevir(en_az), sayiya_cevir(en_cok)
        if min_f is None or max_f is None:
            continue
        satirlar.append({
            "tarih": gun.isoformat(),
            "urun": ad.title(),
            "il": "İzmir",
            "min_fiyat": min_f,
            "max_fiyat": max_f,
            "kaynak_url": "eislem.izmir.bel.tr (Izmir B.B. resmi)",
        })
    return satirlar


def supabaseye_yaz(satirlar: list[dict]) -> None:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    supabase = create_client(url, key)
    supabase.table("fiyatlar").upsert(
        satirlar,
        on_conflict="tarih,urun,il",
    ).execute()


def main():
    gun = date.today()
    if len(sys.argv) > 1:
        gun = datetime.strptime(sys.argv[1], "%Y-%m-%d").date()

    print(f"İzmir hal fiyatları çekiliyor: {gun}")
    satirlar = gun_verisini_cek(gun)
    print(f"{len(satirlar)} satır bulundu.")

    if not satirlar:
        print("UYARI: Hiç satır bulunamadı (o gün için veri yayınlanmamış olabilir). Çıkılıyor.")
        return

    supabaseye_yaz(satirlar)
    print("Supabase'e yazıldı (upsert — aynı gün tekrar çalışsa da sorun olmaz).")


if __name__ == "__main__":
    main()
