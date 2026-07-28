"""
T.C. Ticaret Bakanlığı Hal Kayıt Sistemi (hal.gov.tr) — Ürün Fiyat
İstatistikleri sayfasından TÜRKİYE GENELİ ORTALAMA fiyatları çeker ve
DOĞRUDAN Supabase'e yazar (il = "Türkiye Ortalaması").

Kaynak: https://www.hal.gov.tr/Sayfalar/FiyatDetaylari.aspx

ÖNEMLİ — bu kaynağın DOĞASI diğer scraper'lardan farklı:
  - Bu sayfa ŞEHİR bazlı değil, TÜM TÜRKİYE için TEK bir ortalama verir.
    (İl/Hal kolonu yok — sadece Ürün Adı / Cinsi / Türü / Ortalama Fiyat /
    İşlem Hacmi / Birim.) Bu yüzden İstanbul/İzmir scraper'larının YERİNE
    geçmez, onları TAMAMLAR — "Türkiye Ortalaması" diye ayrı bir "il"
    satırı olarak eklenir.
  - Sayfa girişsiz (login gerektirmiyor) ve bot koruması yok — sadece
    resmi ASP.NET/SharePoint sayfalama (__doPostBack) var.
  - Sayfa TÜM ürünleri (yaklaşık 1200+) alfabetik sırayla, sayfa başına
    ~25 satır olacak şekilde listeliyor. Bizim kataloğumuzdaki ürünler
    (Domates, Biber, Patlıcan...) alfabede geriye düştüğü için onlara
    ulaşmak için ONLARCA sayfa gezmek gerekiyor — bu normal, kaynağın
    kendi yapısı böyle, filtre/arama parametresi bulunamadı.
  - Sadece "Geleneksel(Konvansiyonel)" türündeki satırlar alınıyor
    (Organik / İyi Tarım fiyatları çok daha yüksek oluyor, karışırsa
    grafik yanıltıcı olur).
  - Bülten "bugün" için sorgulansa da aslında BİR GÜN ÖNCEKİ veriyi
    kullanıyor (sayfanın kendi notu: "Bülten Tarihi : X (Y Tarihli
    Veriler Kullanılmıştır.)") — bu yüzden gerçek tarihi sayfadaki bu
    notu okuyarak buluyoruz, tahmin etmiyoruz.

DOĞRULAMA NOTU: __doPostBack sayfalama mekanizması ve tablo yapısı
elle (tarayıcıdan) doğrulandı, ama bu script'in TAM sayfalama akışı
(POST ile sayfa 2, 3, 4...) otomatik ortamda gerçek siteye karşı HENÜZ
uçtan uca test edilmedi (ağ erişimi kısıtlı bir ortamda yazıldı).
İLK ÇALIŞTIRMAYI mutlaka GitHub Actions'ta elle (workflow_dispatch)
tetikleyip logu kontrol ederek doğrula.

Ortam değişkenleri (GitHub Actions secrets üzerinden gelecek):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY   (anon key DEĞİL — yazma yetkisi olan secret key)
"""

import os
import re
import sys
import time
from datetime import date, datetime

import requests
from bs4 import BeautifulSoup
from supabase import create_client

BASE_URL = "https://www.hal.gov.tr/Sayfalar/FiyatDetaylari.aspx"
IL_ADI = "Türkiye Ortalaması"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    "Accept-Language": "tr-TR,tr;q=0.9",
    "Referer": BASE_URL,
}

# Sadece bu türdeki satırları alıyoruz (Organik / İyi Tarım hariç).
ISTENEN_URUN_TURU = "Geleneksel(Konvansiyonel)"

MAKS_SAYFA = 60          # güvenlik sınırı — sonsuz döngüye girmesin
SAYFA_BEKLEME_SANIYE = 1  # siteye nazik davranalım

# Python'un .title() fonksiyonu Türkçe İ/I harflerini bozuyor — Türkçe'ye
# özel title-case (izmir_otomatik.py'deki ile aynı, tutarlılık için).
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


# ============================================
# KATALOG EŞLEŞTİRME
# hal.gov.tr'nin "Ürün Adı" + "Ürün Cinsi" ikilisini, bizim
# products.js -> URUN_KATALOG'daki tamUrunAdi() çıktısına çeviriyoruz.
# SADECE burada listelenenler eklenir — eşleşmeyenler ATLANIR ve
# raporlanır (tahmin/uydurma yok, kataloğa yeni satır eklemek istersen
# aşağıdaki listeye ekleyip products.js'e de eklemen yeterli).
#
# Anahtar: (ÜRÜN ADI, ÜRÜN CİNSİ) — ikisi de hal.gov.tr'de göründüğü
# gibi BÜYÜK HARF. Değer: Supabase'e yazılacak tam ürün adı.
# ============================================
KATALOG_ESLESTIRME = {
    ("DOMATES", "DOMATES"):        "Domates",
    ("DOMATES", "SALKIM"):         "Domates Salkım",
    ("DOMATES", "PEMBE"):          "Domates Pembe",
    ("DOMATES", "KOKTEYL"):        "Domates Kokteyl",
    ("DOMATES", "SALÇALIK"):       "Domates Salçalık",
    ("DOMATES", "CHERRY"):         "Domates Cherry",
    ("DOMATES", "SERA"):           "Domates Sera",

    ("BİBER", "DOLMA"):            "Biber Dolma",
    ("BİBER", "SİVRİ"):            "Biber Sivri",
    ("BİBER", "ÇARLİSTON"):        "Biber Çarliston",
    ("BİBER", "KAPYA"):            "Biber Kapya",
    ("BİBER", "KÖY BİBERİ"):       "Biber Köybiberi",
    ("BİBER", "CİN"):              "Biber Cin",
    ("BİBER", "KALİFORNİYA SARI"): "Biber Kaliforniya Sarı",

    ("SALATALIK", "SALATALIK"):    "Salatalık",
    ("SALATALIK", "SİLOR"):        "Salatalık Silor",

    ("PATLICAN", "PATLICAN"):      "Patlıcan",
    ("KARPUZ", "KARPUZ"):          "Karpuz",
    ("KABAK", "KABAK"):            "Kabak",

    ("ARMUT", "DEVECİ"):           "Armut Deveci",
    ("ARMUT", "SANTAMARİ"):        "Armut Santamaria",

    ("ELMA", "STARKİNG"):          "Elma Starking",
    ("ELMA", "GOLDEN"):            "Elma Golden",

    ("KARPUZ", "AŞIRI OLGUN"):     None,  # örnek: bilerek atlanan bir cins
}


def sayiya_cevir(deger: str):
    deger = deger.replace(".", "").replace(",", ".").strip()
    try:
        return float(deger)
    except ValueError:
        return None


def gizli_alanlari_al(soup: BeautifulSoup) -> dict:
    alanlar = {}
    for ad in ("__VIEWSTATE", "__EVENTVALIDATION", "__VIEWSTATEGENERATOR"):
        etiket = soup.find("input", {"name": ad})
        alanlar[ad] = etiket["value"] if etiket else ""
    return alanlar


def bulten_tarihini_bul(soup: BeautifulSoup) -> date:
    """Sayfadaki 'Bülten Tarihi : X (Y Tarihli Veriler Kullanılmıştır.)'
    notundan GERÇEK veri tarihini (Y) çıkarır. Bulamazsa bugünün
    tarihinden bir gün öncesini varsayar (diğer scraper'lardaki gibi)."""
    metin = soup.get_text(" ", strip=True)
    eslesme = re.search(r"(\d{2}\.\d{2}\.\d{4})\s*Tarihli Veriler", metin)
    if eslesme:
        return datetime.strptime(eslesme.group(1), "%d.%m.%Y").date()
    print("  [uyarı] bülten tarihi metinde bulunamadı, dünün tarihi varsayılıyor.")
    from datetime import timedelta
    return date.today() - timedelta(days=1)


def sayfadaki_satirlar(soup: BeautifulSoup) -> list[dict]:
    satirlar = []
    table = None
    for t in soup.find_all("table"):
        baslik = t.get_text()
        if "Ürün Adı" in baslik and "Ortalama Fiyat" in baslik:
            table = t
            break
    if table is None:
        return satirlar

    for tr in table.find_all("tr"):
        hucreler = [td.get_text(strip=True) for td in tr.find_all("td")]
        if len(hucreler) != 6:
            continue
        urun_adi, urun_cinsi, urun_turu, ort_fiyat, _islem_hacmi, birim = hucreler
        if urun_adi in ("", "Ürün Adı"):
            continue
        if urun_turu != ISTENEN_URUN_TURU:
            continue
        satirlar.append({
            "urun_adi": urun_adi.strip().upper(),
            "urun_cinsi": urun_cinsi.strip().upper(),
            "fiyat": sayiya_cevir(ort_fiyat),
            "birim": birim.strip(),
        })
    return satirlar


def tum_sayfalari_gez() -> tuple[list[dict], date]:
    s = requests.Session()
    s.headers.update(HEADERS)

    resp = s.get(BASE_URL, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    veri_tarihi = bulten_tarihini_bul(soup)
    print(f"  Gerçek veri tarihi: {veri_tarihi}")

    tum_satirlar = sayfadaki_satirlar(soup)
    print(f"  [sayfa 1] {len(tum_satirlar)} uygun satır (filtrelenmemiş toplam listeden).")

    sayfa = 2
    while sayfa <= MAKS_SAYFA:
        alanlar = gizli_alanlari_al(soup)
        if not alanlar["__VIEWSTATE"]:
            print("  [uyarı] __VIEWSTATE bulunamadı, sayfalama durduruldu.")
            break

        payload = {
            "__EVENTTARGET": "ctl00$ctl37$g_7e86b8d6_3aea_47cf_b1c1_939799a091e0$gvFiyatlar",
            "__EVENTARGUMENT": f"Page${sayfa}",
            **alanlar,
        }
        try:
            resp = s.post(BASE_URL, data=payload, timeout=30)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"  [sayfa {sayfa}] istek hatası, durduruluyor: {e}")
            break

        soup = BeautifulSoup(resp.text, "lxml")
        satirlar = sayfadaki_satirlar(soup)
        if not satirlar:
            print(f"  [sayfa {sayfa}] satır yok, son sayfaya gelinmiş olabilir. Duruluyor.")
            break

        tum_satirlar.extend(satirlar)
        print(f"  [sayfa {sayfa}] {len(satirlar)} uygun satır.")
        sayfa += 1
        time.sleep(SAYFA_BEKLEME_SANIYE)

    return tum_satirlar, veri_tarihi


def kataloga_gore_filtrele(ham_satirlar: list[dict], veri_tarihi: date) -> list[dict]:
    sonuc = []
    atlanan = set()
    for s in ham_satirlar:
        anahtar = (s["urun_adi"], s["urun_cinsi"])
        tam_ad = KATALOG_ESLESTIRME.get(anahtar)
        if tam_ad is None:
            atlanan.add(anahtar)
            continue
        if s["fiyat"] is None:
            continue
        sonuc.append({
            "tarih": veri_tarihi.isoformat(),
            "urun": tam_ad,
            "il": IL_ADI,
            "min_fiyat": s["fiyat"],
            "max_fiyat": s["fiyat"],  # kaynak tek "ortalama" veriyor, min=max
            "kaynak_url": "hal.gov.tr - T.C. Ticaret Bakanlığı Hal Kayıt Sistemi (resmi, ulusal ortalama)",
        })

    if atlanan:
        print(f"  [bilgi] Kataloğa eşleşmediği için atlanan {len(atlanan)} (ürün, cins) kombinasyonu:")
        for a in sorted(atlanan):
            print(f"    - {a}")

    return sonuc


def supabaseye_yaz(satirlar: list[dict]) -> None:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    supabase = create_client(url, key)
    supabase.table("fiyatlar").upsert(
        satirlar,
        on_conflict="tarih,urun,il",
    ).execute()


def main():
    print("hal.gov.tr Türkiye ortalaması fiyatları çekiliyor...")
    ham_satirlar, veri_tarihi = tum_sayfalari_gez()
    print(f"TOPLAM {len(ham_satirlar)} uygun (Geleneksel/Konvansiyonel) satır tarandı.")

    satirlar = kataloga_gore_filtrele(ham_satirlar, veri_tarihi)
    print(f"Kataloğumuzla eşleşen {len(satirlar)} satır bulundu.")

    if not satirlar:
        print("UYARI: Eşleşen satır yok. Çıkılıyor (Supabase'e yazılmadı).")
        return

    supabaseye_yaz(satirlar)
    print("Supabase'e yazıldı (upsert — aynı gün tekrar çalışsa da sorun olmaz).")


if __name__ == "__main__":
    main()
