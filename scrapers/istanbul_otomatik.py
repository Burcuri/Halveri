"""
İstanbul Büyükşehir Belediyesi Avrupa Yakası Hal Müdürlüğü'nden günlük
sebze/meyve hal fiyatlarını çeker ve DOĞRUDAN Supabase'e yazar.

Kaynak: https://tarim.ibb.istanbul/avrupa-yakasi-hal-mudurlugu/hal-fiyatlari.html
Gerçek veri endpoint'i (tarayıcı Network sekmesinden bulundu):
    https://tarim.ibb.istanbul/inc/halfiyatlari/gunluk_fiyatlar.asp
    ?tarih=YYYY-MM-DD&kategori=N&tUsr=...&tPas=...&tVal=...&HalTurId=2

Bu site İzmir'in aksine oturum/çerez gerektirmiyor, düz GET isteğiyle
doğrudan HTML tablo dönüyor — çok daha stabil bir kaynak.

KATEGORİ KODLARI BİLİNMİYOR: site dropdown'ında sadece "Meyve / Sebze /
İthal Ürünler" var ama hangi sayının hangisine karşılık geldiğini
bilmiyoruz (Sebze=6 olduğunu biliyoruz, diğerleri farklı/rastgele
olabilir). Bu yüzden script 1'den 20'ye kadar tüm kategori kodlarını
dener; geçerli bir tablo dönen her kodu kabul eder. Böylece elle hangi
sayının ne olduğunu bulmaya gerek kalmadan tüm kategoriler kapsanmış
olur (aynı ürün iki kategoride çıksa bile upsert sayesinde sorun olmaz).

TAKVİM: İzmir'de öğrendiğimiz derse göre, script varsayılan olarak
"bugün" değil "DÜN" için veri çekiyor (günün verisi gün içinde henüz
kesinleşmemiş olabiliyor).

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

BASE_URL = "https://tarim.ibb.istanbul/inc/halfiyatlari/gunluk_fiyatlar.asp"

# Tarayıcıdan yakalanan sabit erişim bilgileri (kullanıcı adı/şifre değil,
# sitenin kendi iç API token'ları — herkese açık sayfada zaten görünüyorlar)
SABIT_PARAMS = {
    "tUsr": "M3yV353bZe",
    "tPas": "LA74sBcXERpdBaz",
    "tVal": "881f3dc3-7d08-40db-b45a-1275c0245685",
    "HalTurId": "2",  # Avrupa Yakası Hali
}

KATEGORI_DENEME_ARALIGI = range(1, 21)  # 1..20 arası kategori kodları denenecek

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    "Accept-Language": "tr-TR,tr;q=0.9",
    "Referer": "https://tarim.ibb.istanbul/avrupa-yakasi-hal-mudurlugu/hal-fiyatlari.html",
}


def sayiya_cevir(deger: str):
    deger = deger.replace("TL", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(deger)
    except ValueError:
        return None


def kategori_verisini_cek(s: requests.Session, gun: date, kategori: int) -> list[dict]:
    params = {"tarih": gun.strftime("%Y-%m-%d"), "kategori": kategori, **SABIT_PARAMS}
    try:
        resp = s.get(BASE_URL, params=params, timeout=20)
    except requests.RequestException as e:
        print(f"  [kategori {kategori}] istek hatası: {e}")
        return []

    if resp.status_code != 200:
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    table = None
    for t in soup.find_all("table"):
        if "Urun Adı" in t.get_text() or "Ürün Adı" in t.get_text():
            table = t
            break
    if table is None:
        return []

    satirlar = []
    for tr in table.find_all("tr"):
        hucreler = [td.get_text(strip=True) for td in tr.find_all("td")]
        if len(hucreler) < 4:
            continue
        ad, birim, en_az, en_cok = hucreler[:4]
        if ad in ("", "Urun Adı", "Ürün Adı"):
            continue
        min_f, max_f = sayiya_cevir(en_az), sayiya_cevir(en_cok)
        if min_f is None or max_f is None:
            continue
        satirlar.append({
            "tarih": gun.isoformat(),
            "urun": ad.strip(),
            "il": "İstanbul",
            "min_fiyat": min_f,
            "max_fiyat": max_f,
            "kaynak_url": "tarim.ibb.istanbul (Avrupa Yakası Hali, resmi)",
        })
    if satirlar:
        print(f"  [kategori {kategori}] {len(satirlar)} satır bulundu.")
    return satirlar


def gun_verisini_cek(gun: date) -> list[dict]:
    s = requests.Session()
    s.headers.update(HEADERS)
    tum_satirlar = []
    gorulen_urunler = set()
    for kategori in KATEGORI_DENEME_ARALIGI:
        for kategori_satirlari in [kategori_verisini_cek(s, gun, kategori)]:
            for satir in kategori_satirlari:
                anahtar = satir["urun"]
                if anahtar in gorulen_urunler:
                    continue  # aynı ürün başka bir kategori kodunda tekrar geldi
                gorulen_urunler.add(anahtar)
                tum_satirlar.append(satir)
        time.sleep(0.3)  # siteye nazik davranalım
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
    # Varsayılan: DÜN (İzmir'den öğrendiğimiz gibi, günün verisi gün
    # içinde henüz kesinleşmemiş olabiliyor). Elle tarih verilirse onu kullanır.
    gun = date.today() - timedelta(days=1)
    if len(sys.argv) > 1:
        gun = datetime.strptime(sys.argv[1], "%Y-%m-%d").date()

    print(f"İstanbul (Avrupa Yakası) hal fiyatları çekiliyor: {gun}")
    satirlar = gun_verisini_cek(gun)
    print(f"TOPLAM {len(satirlar)} satır bulundu.")

    if not satirlar:
        print("UYARI: Hiç satır bulunamadı. Çıkılıyor.")
        return

    supabaseye_yaz(satirlar)
    print("Supabase'e yazıldı (upsert — aynı gün tekrar çalışsa da sorun olmaz).")


if __name__ == "__main__":
    main()
