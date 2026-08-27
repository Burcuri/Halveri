import os
import sys
import re
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime, timedelta


# ---------------------------------------------------------------------------
# Supabase
# ---------------------------------------------------------------------------
def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        print("❌ SUPABASE_URL veya SUPABASE_KEY bulunamadı!")
        sys.exit(1)
    return create_client(url, key)


# ---------------------------------------------------------------------------
# Ortak yardımcılar
# ---------------------------------------------------------------------------
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

AY_MAP = {
    "ocak": 1, "şubat": 2, "mart": 3, "nisan": 4,
    "mayıs": 5, "haziran": 6, "temmuz": 7, "ağustos": 8,
    "eylül": 9, "ekim": 10, "kasım": 11, "aralık": 12,
}


def parse_tr_date(text: str) -> str | None:
    """'27 Ağustos 2026' → '2026-08-27'"""
    m = re.search(
        r"(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|"
        r"Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})",
        text,
        re.IGNORECASE,
    )
    if not m:
        return None
    gun, ay_adi, yil = m.group(1), m.group(2).lower(), m.group(3)
    ay = AY_MAP.get(ay_adi)
    if not ay:
        return None
    return f"{yil}-{ay:02d}-{int(gun):02d}"


# ---------------------------------------------------------------------------
# KAYNAK 1 — İBB resmi (eski ASP endpoint)
# ---------------------------------------------------------------------------
def fiyat_cek_ibb(tarih: str, headers: dict) -> list:
    kategoriler = {
        "5": "Meyve",
        "6": "Sebze",
        "7": "İthal Ürünler",
    }
    veriler = []

    for kategori_id, kategori_adi in kategoriler.items():
        print(f"📡 [İBB] {kategori_adi} çekiliyor... (tarih: {tarih})")

        params = {
            "tarih": tarih,
            "kategori": kategori_id,
            "tUsr": "M3yV353bZe",
            "tPas": "LA74sBcXERpdBaz",
            "tVal": "881f3dc3-7d08-40db-b45a-1275c0245685",
            "HalTurId": "2",
        }

        try:
            response = requests.get(
                "https://tarim.ibb.istanbul/inc/halfiyatlari/gunluk_fiyatlar.asp",
                params=params,
                headers=headers,
                timeout=45,
            )
            response.raise_for_status()
            # İBB bazen Windows-1254 gönderir
            if not response.encoding or response.encoding.lower() in ("iso-8859-1", "ascii"):
                response.encoding = "utf-8"
        except Exception as e:
            print(f"❌ [İBB] {kategori_adi} isteği başarısız: {e}")
            continue

        soup = BeautifulSoup(response.text, "html.parser")
        tablo = soup.find("table")
        if not tablo:
            print(f"⚠️  [İBB] {kategori_adi} için tablo bulunamadı.")
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
                        "tarih": tarih,
                    })
                    sayac += 1
        print(f"✅ [İBB] {kategori_adi}: {sayac} ürün eklendi.")

    return veriler


def ibb_son_5_gun(headers: dict) -> tuple[list, str | None]:
    """İBB'den bugünden geriye 5 gün dener. (veriler, kullanilan_tarih) döner."""
    bugun = datetime.now()
    tarihler = [(bugun - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(5)]

    for t in tarihler:
        veriler = fiyat_cek_ibb(t, headers)
        if veriler:
            return veriler, t
        print(f"⚠️  [İBB] {t} boş, önceki gün deneniyor...")
    return [], None


# ---------------------------------------------------------------------------
# KAYNAK 2 — GidaVeri (İstanbul Avrupa Yakası yedek kaynak)
# ---------------------------------------------------------------------------
def fiyat_cek_gidaveri(headers: dict) -> tuple[list, str | None]:
    """
    https://gidaveri.com/sehir/istanbul/
    data-name / data-min / data-max attribute'larından ürün listesini çıkarır.
    """
    url = "https://gidaveri.com/sehir/istanbul/"
    print(f"📡 [GidaVeri] İstanbul Avrupa Yakası çekiliyor... ({url})")

    try:
        response = requests.get(url, headers=headers, timeout=45)
        response.raise_for_status()
        response.encoding = "utf-8"
    except Exception as e:
        print(f"❌ [GidaVeri] istek başarısız: {e}")
        return [], None

    soup = BeautifulSoup(response.text, "html.parser")

    # Sayfadaki tarih (ör. "27 Ağustos 2026")
    tarih = parse_tr_date(response.text)
    if not tarih:
        # fallback: bugün
        tarih = datetime.now().strftime("%Y-%m-%d")
        print(f"⚠️  [GidaVeri] tarih parse edilemedi, bugün kullanılıyor: {tarih}")
    else:
        print(f"📅 [GidaVeri] sayfa tarihi: {tarih}")

    items = soup.select("[data-name][data-min][data-max]")
    if not items:
        print("⚠️  [GidaVeri] data-name/min/max öğesi bulunamadı.")
        return [], None

    veriler = []
    for el in items:
        urun_adi = (el.get("data-name") or "").strip()
        en_dusuk = (el.get("data-min") or "").strip()
        en_yuksek = (el.get("data-max") or "").strip()
        if not urun_adi:
            continue
        # Sayı formatını string olarak bırak (mevcut şema ile uyumlu)
        veriler.append({
            "sehir": "İstanbul",
            "urun_adi": urun_adi,
            "en_dusuk": en_dusuk,
            "en_yuksek": en_yuksek,
            "tarih": tarih,
        })

    print(f"✅ [GidaVeri] {len(veriler)} ürün eklendi.")
    return veriler, tarih


# ---------------------------------------------------------------------------
# KAYNAK 3 — Supabase'ten son başarılı günü kopyala
# ---------------------------------------------------------------------------
def son_basarili_gunden_kopyala(supabase: Client) -> tuple[list, str | None]:
    """
    Veritabanındaki en son İstanbul kaydını alır,
    tarihini bugüne çevirip yeniden kaydetmeye hazır liste döner.
    """
    bugun = datetime.now().strftime("%Y-%m-%d")
    print("📡 [Fallback] Supabase'ten son başarılı İstanbul verisi aranıyor...")

    try:
        resp = (
            supabase.table("hal_fiyatlari")
            .select("*")
            .eq("sehir", "İstanbul")
            .order("tarih", desc=True)
            .limit(500)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            print("⚠️  [Fallback] Supabase'te hiç İstanbul kaydı yok.")
            return [], None

        son_tarih = rows[0]["tarih"]
        # Aynı tarihteki tüm ürünleri al
        son_gun = [r for r in rows if r.get("tarih") == son_tarih]
        if not son_gun:
            return [], None

        veriler = []
        for r in son_gun:
            veriler.append({
                "sehir": "İstanbul",
                "urun_adi": r["urun_adi"],
                "en_dusuk": r["en_dusuk"],
                "en_yuksek": r["en_yuksek"],
                "tarih": bugun,  # bugünün tarihiyle kaydet
            })

        print(
            f"✅ [Fallback] {len(veriler)} ürün kopyalandı "
            f"(kaynak tarih: {son_tarih} → hedef: {bugun})"
        )
        return veriler, bugun
    except Exception as e:
        print(f"❌ [Fallback] Supabase okuma hatası: {e}")
        return [], None


# ---------------------------------------------------------------------------
# Ana akış
# ---------------------------------------------------------------------------
def ibb_fiyatlarini_cek():
    headers = DEFAULT_HEADERS.copy()
    veriler: list = []
    kullanilan_tarih: str | None = None
    kaynak = None

    # 1) Resmi İBB
    print("\n——— KAYNAK 1: İBB (tarim.ibb.istanbul) ———")
    veriler, kullanilan_tarih = ibb_son_5_gun(headers)
    if veriler:
        kaynak = "İBB"

    # 2) GidaVeri yedek
    if not veriler:
        print("\n——— KAYNAK 2: GidaVeri (yedek) ———")
        veriler, kullanilan_tarih = fiyat_cek_gidaveri(headers)
        if veriler:
            kaynak = "GidaVeri"

    # 3) Son bilinen günü taşı
    if not veriler:
        print("\n——— KAYNAK 3: Son başarılı gün (Supabase) ———")
        try:
            supabase = get_supabase_client()
            veriler, kullanilan_tarih = son_basarili_gunden_kopyala(supabase)
            if veriler:
                kaynak = "Fallback-SonGun"
        except Exception as e:
            print(f"❌ Supabase client oluşturulamadı: {e}")

    if not veriler:
        print("\n⚠️  Hiçbir kaynaktan veri alınamadı.")
        sys.exit(1)

    print(
        f"\n📦 Toplam {len(veriler)} ürün Supabase'e yazılıyor... "
        f"(tarih: {kullanilan_tarih}, kaynak: {kaynak})"
    )

    try:
        supabase = get_supabase_client()
        supabase.table("hal_fiyatlari").upsert(
            veriler,
            on_conflict="urun_adi,sehir,tarih",
        ).execute()
        print(
            f"🎉 Başarılı! {len(veriler)} ürün kaydedildi. "
            f"({kullanilan_tarih} · {kaynak})"
        )
    except Exception as e:
        print(f"❌ Supabase yazma hatası: {e}")
        sys.exit(1)


if __name__ == "__main__":
    ibb_fiyatlarini_cek()
