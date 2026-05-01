-- ============================================================
-- Migraatio: asiakastietolomake_versiot.otsikko
-- Päivämäärä: 2026-05-01
--
-- Lisää valinnaisen otsikko-kentän hoitokäynnille. Käytetään
-- Asiakasrekisterin käyntipillereissä ("15.04.25 · Niskakipu, alkuhoito"),
-- KayntiNakyma-modaalin otsikossa ja Kayntihistoria-listalla.
--
-- Idempotentti — voi ajaa puhtaaseen DB:hen tai olemassa olevaan.
-- ============================================================

ALTER TABLE asiakastietolomake_versiot
  ADD COLUMN IF NOT EXISTS otsikko text
  CHECK (otsikko IS NULL OR length(otsikko) <= 50);

COMMENT ON COLUMN asiakastietolomake_versiot.otsikko IS
  'Käynnin lyhyt otsikko (max 50 merkkiä) jota näytetään käyntipillereissä ja käyntihistoriassa.';
