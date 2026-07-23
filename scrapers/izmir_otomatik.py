"""
İzmir Büyükşehir Belediyesi E-İşlem Merkezi'nden günlük sebze/meyve
hal fiyatlarını çeker ve DOĞRUDAN Supabase'e yazar.

Bu, GitHub Actions ile her gün otomatik çalışacak sürüm — CSV ara
adımı yok, elle bir şey yüklemene gerek yok.

Kaynak: https://eislem.izmir.bel.tr/tr/HalFiyatlari/20/2

NOT (23.07.2026 güncellemesi):
  - Site "tip" parametresi olarak 0 kabul etmiyor; kategoriler
    1=Sebze, 2=Meyve, 3=İthal olarak ayrı ayrı istenmeli.
  - Site, düz (session'sız) isteklerde bazen boş sonuç
    döndürebiliyor. Bu yüzden artık önce ana sayfaya bir kez
    girip çerez (cookie) alıyoruz, sonra veri isteğini o
    oturumla (session) atıyoruz — normal bir tarayıcının yaptığı
    gibi.
  - ÖNEMLİ DÜZELTME: Python'un standart .title() fonksiyonu
    Türkçe "İ" ve "I" harflerini yanlış küçültüyor (görünmez
    "nokta" karakterleri ekliyor / noktasız "ı" yerine noktalı
    "i" kullanıyor). Bu yüzden "Biber Sivri" gibi isimler
    Supabase'e görünüşte aynı ama aslında farklı bayt dizileriyle
    yazılıyordu ve uygulama bunları hiç bulamıyordu. Artık
    Türkçe'ye özel turkce_title() fonksiyonu kullanılıyor.

Ortam değişkenleri (GitHub Actions secrets üzerinden gelecek):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY   (anon key DEĞİL — yazma yetkisi olan secret key)
"""

import os
import sys
import time
from datetime import date, datetime

import requests
from bs4 import BeautifulSoup
from supabase import create_client

BASE_PAGE = "https://eislem.izmir.bel.tr/tr/HalFiyatlari/20"
BASE_URL = "https://eislem.izmir.bel.tr/tr/HalFiyatlari/20/2"

# Kategori (tip) değerleri — sitedeki dropdown sırasıyla eşleşiyor
KATEGORILER = {1: "Sebze", 2: "Meyve", 3: "İthal"}

# Python'un .title() fonksiyonu Türkçe İ/I harflerini bozuyor
# (görünmez birleşik karakterler ekliyor / yanlış "ı" yerine "i" kullanıyor).
# Bu yüzden Türkçe'ye özel bir title-case fonksiyonu kullanıyoruz.
_TR_KUCUK = str.maketrans("İIŞĞÜÇÖ", "iışğüçö")
_TR_BUYUK_TEK = {"i": "İ", "ı": "I", "ş": "Ş", "ğ": "Ğ", "ü": "Ü", "ç": "Ç", "ö": "Ö"}


def turkce_title(metin: str) -> str:
    kucuk = metin.translate(_TR_KUCUK).lower()
    kelimeler = kucuk.split(" ")
    sonuc = []
    for k in kelimeler:
        if not k:
            sonuc.append(k)
            continue
        ilk = _TR_BUYUK_TEK.get(k[0], k[0].upper())
        sonuc.append(ilk + k[1:])
    return " ".join(sonuc)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    "Accept-Language": "tr-TR,tr;q=0.9",
    "Referer": BASE_PAGE,
}


def oturum_ac() -> requests.Session:
    """Gerçek bir tarayıcı gibi önce ana sayfaya girip çerez alır."""
    s = requests.Session()
    s.headers.update(HEADERS)
    resp = s.get(BASE_PAGE, timeout=30)
    print(f"  [oturum] ana sayfa durum kodu: {resp.status_code}, çerezler: {list(s.cookies.keys())}")
    return s


def kategori_verisini_cek(s: requests.Session, gun: date, tip: int) -> list[dict]:
    params = {"date": gun.strftime("%Y-%m-%d"), "tip": tip, "aranacak": ""}
    resp = s.get(BASE_URL, params=params, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    if "Listelenecek kayıt bulunmamaktadır" in resp.text:
        print(f"  [{KATEGORILER[tip]}] site 'kayıt yok' dedi (durum kodu {resp.status_code})")
        return []

    table = None
    for t in soup.find_all("table"):
        if "Adı" in t.get_text() and "En Az" in t.get_text():
            table = t
            break
    if table is None:
        print(f"  [{KATEGORILER[tip]}] tablo bulunamadı (durum kodu {resp.status_code})")
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
        _tip, ad, birim, en_az, en_cok, ortalama = hucreler[:6]
        if ad in ("", "Adı"):
            continue
        min_f, max_f = sayiya_cevir(en_az), sayiya_cevir(en_cok)
        if min_f is None or max_f is None:
            continue
        satirlar.append({
            "tarih": gun.isoformat(),
            "urun": turkce_title(ad),
            "il": "İzmir",
            "min_fiyat": min_f,
            "max_fiyat": max_f,
            "kaynak_url": "eislem.izmir.bel.tr (Izmir B.B. resmi)",
        })
    print(f"  [{KATEGORILER[tip]}] {len(satirlar)} satır bulundu.")
    return satirlar


def gun_verisini_cek(gun: date) -> list[dict]:
    s = oturum_ac()
    tum_satirlar = []
    for tip in KATEGORILER:
        tum_satirlar.extend(kategori_verisini_cek(s, gun, tip))
        time.sleep(1)  # siteye nazik davranalım
    return tum_satirlar


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
    print(f"TOPLAM {len(satirlar)} satır bulundu.")

    if not satirlar:
        print("UYARI: Hiç satır bulunamadı (o gün için veri yayınlanmamış olabilir "
              "ya da site otomasyon isteklerini engelliyor olabilir). Çıkılıyor.")
        return

    supabaseye_yaz(satirlar)
    print("Supabase'e yazıldı (upsert — aynı gün tekrar çalışsa da sorun olmaz).")


if __name__ == "__main__":
    main()
