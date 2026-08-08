import os
import sys
import time
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

def izmir_fiyat_cek(tarih: str, deneme: int = 3) -> list:
    url = f"https://openapi.izmir.bel.tr/api/ibb/halfiyatlari/sebzemeyve/{tarih}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    print(f"📡 İzmir çekiliyor... (tarih: {tarih})")

    for i in range(deneme):
        try:
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code in (404, 204) or not r.content:
                print(f"⚠️  {tarih} için veri yok (HTTP {r.status_code}).")
                return []
            if r.status_code >= 500:
                print(f"⚠️  Sunucu hatası {r.status_code}, deneme {i+1}/{deneme}...")
                time.sleep(2)
                continue
            r.raise_for_status()
            data = r.json()
            if isinstance(data, dict) and data.get("message"):
                print(f"⚠️  API mesajı: {data.get('message')}")
                time.sleep(2)
                continue
            break
        except Exception as e:
            print(f"❌ İstek hatası: {e} (deneme {i+1}/{deneme})")
            time.sleep(2)
            data = None
    else:
        return []

    liste = (data or {}).get("HalFiyatListesi") or []
    veriler = []

    for item in liste:
        urun = (item.get("MalAdi") or "").strip()
        if not urun:
            continue
        en_dusuk = item.get("AsgariUcret")
        en_yuksek = item.get("AzamiUcret")
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
    bugun = datetime.now()
    # Bugün + son 3 gün dene
    tarihler = [(bugun - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(4)]

    veriler = []
    kullanilan = None
    for t in tarihler:
        veriler = izmir_fiyat_cek(t)
        if veriler:
            kullanilan = t
            break
        print(f"⚠️  {t} boş, önceki gün deneniyor...")

    if not veriler:
        print("⚠️  İzmir için hiç veri bulunamadı (API geçici kapalı olabilir).")
        # Workflow'u düşürmesin — İstanbul kaydı kalsın
        sys.exit(0)

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
