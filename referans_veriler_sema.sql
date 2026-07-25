-- ============================================
-- REFERANS VERİLER TABLOSU
-- Ürün fiyatı değil, kıyas amaçlı seriler (enflasyon %, mazot TL/lt).
-- Grafikte ayrı (sağ) eksene bağlanıp gri/kalın çizgi olarak gösterilir.
-- Supabase Dashboard -> SQL Editor -> yapıştır -> Run
-- ============================================

CREATE TABLE IF NOT EXISTS referans_veriler (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tarih DATE NOT NULL,
  tip TEXT NOT NULL,           -- 'enflasyon' | 'mazot'
  deger NUMERIC NOT NULL,      -- enflasyon: yıllık % / mazot: TL/lt
  kaynak_url TEXT,
  UNIQUE (tarih, tip)
);

-- RLS: fiyatlar tablosundaki gibi, herkes okuyabilsin, yazma sadece
-- service_role (scraper/elle SQL) ile olsun.
ALTER TABLE referans_veriler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes okuyabilir" ON referans_veriler
  FOR SELECT USING (true);

-- ============================================
-- ÖRNEK / YER TUTUCU VERİ — GERÇEK DEĞİLDİR.
-- Bunları TÜİK (enflasyon, aylık TÜFE) ve EPDK (mazot pompa fiyatı)
-- gibi resmi kaynaklardan gerçek verilerle DEĞİŞTİR.
-- Aşağıdaki satırları silip kendi doğru verilerinle INSERT yap.
-- ============================================
-- INSERT INTO referans_veriler (tarih, tip, deger, kaynak_url) VALUES
-- ('2026-07-17', 'enflasyon', 45.2, 'TÜİK (elle girildi) — YER TUTUCU'),
-- ('2026-07-17', 'mazot', 44.10, 'EPDK (elle girildi) — YER TUTUCU')
-- ON CONFLICT (tarih, tip) DO UPDATE SET
--   deger = EXCLUDED.deger,
--   kaynak_url = EXCLUDED.kaynak_url;
