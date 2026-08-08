import os
import sys
import requests
from supabase import create_client, Client
from datetime import datetime, timedelta

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        print("❌ SUPABASE_URL veya SUPABASE_KEY bulunamadı!")
        sys.exit(1)
    return create_client(url, key)

def izmir_fiyat_cek(tarih: str) -> list:
    url = f"https://openapi.izmir.bel.tr/api/ibb/halfiyatlari/sebzemeyve/{tarih}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    print(f"📡 İzmir çekiliyor... (tarih: {tarih})")

    try:
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code == 404 or not r.content:
            print(f"⚠️  {tarih} için veri yok.")
            return []
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"❌ İzmir isteği başarısız: {e}")
        return []

    liste = data.get("HalFiyatListesi") or []
    veriler = []

    for item in liste:
        urun = (item.get("MalAdi") or "").strip()
        if not urun:
            continue
        en_dusuk = item.get("AsgariUcret")
        en_yuksek = item.get("AzamiUcret")

        # Sayıyı metne çevir (İstanbul ile aynı format)
        en_dusuk_str = f"{en_dusuk:.2f}".replace(".", ",") if en_dusuk is not None else ""
        en_yuksek_str = f"{en_yuksek:.2f}".replace(".", ",") if en_yuksek is not None else ""

        veriler.append({
            "sehir": "İzmir",
            "urun_adi": urun,
            "en_dusuk": en_dusuk_str,
            "en_yuksek": en_yuksek_str,
            "tarih": tarih
        })

    print(f"✅ İzmir: {len(veriler)} ürün eklendi.")
    return veriler

def main():
    bugun = datetime.now().strftime("%Y-%m-%d")
    dun = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    veriler = izmir_fiyat_cek(bugun)
    kullanilan = bugun

    if not veriler:
        print(f"\n⚠️  Bugün ({bugun}) veri yok, dün deneniyor...")
        veriler = izmir_fiyat_cek(dun)
        kullanilan = dun

    if not veriler:
        print("⚠️  İzmir için hiç veri bulunamadı.")
        sys.exit(1)

    print(f"\n📦 Toplam {len(veriler)} İzmir ürünü yazılıyor... ({kullanilan})")

    try:
        sb = get_supabase_client()
        sb.table("hal_fiyatlari").upsert(
            veriler,
            on_conflict="urun_adi,sehir,tarih"
        ).execute()
        print(f"🎉 İzmir başarılı! {len(veriler)} ürün kaydedildi.")
    except Exception as e:
        print(f"❌ Supabase hatası: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
