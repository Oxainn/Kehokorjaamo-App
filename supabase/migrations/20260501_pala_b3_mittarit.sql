-- ============================================================
-- Migraatio: Vaihe B Pala B3 — 15 linjausmittaria hoitokaynnit-tauluun
-- Päivämäärä: 2026-05-01
--
-- Erilliset numeric-sarakkeet (eikä yksi JSONB) jotta Pala B4:n
-- vertailu edelliseen voidaan tehdä suoraan SQL:llä ilman jsonb-purkua.
-- Kaikki nullable — vapaaehtoisia, NULL = "ei mitattu".
-- Idempotentti.
-- ============================================================

ALTER TABLE hoitokaynnit
  ADD COLUMN IF NOT EXISTS lantion_kallistus_aste           numeric,
  ADD COLUMN IF NOT EXISTS lantion_sivuttainen_aste         numeric,
  ADD COLUMN IF NOT EXISTS lantion_kierto_aste              numeric,
  ADD COLUMN IF NOT EXISTS olkapaiden_korkeusero_cm         numeric,
  ADD COLUMN IF NOT EXISTS paan_eteen_tyontyminen_cm        numeric,
  ADD COLUMN IF NOT EXISTS q_kulma_vasen_aste               numeric,
  ADD COLUMN IF NOT EXISTS q_kulma_oikea_aste               numeric,
  ADD COLUMN IF NOT EXISTS skolioosin_kierto_aste           numeric,
  ADD COLUMN IF NOT EXISTS niskan_kaannos_vasen_aste        numeric,
  ADD COLUMN IF NOT EXISTS niskan_kaannos_oikea_aste        numeric,
  ADD COLUMN IF NOT EXISTS jalkapituus_ero_cm               numeric,
  ADD COLUMN IF NOT EXISTS navicular_drop_vasen_mm          numeric,
  ADD COLUMN IF NOT EXISTS navicular_drop_oikea_mm          numeric,
  ADD COLUMN IF NOT EXISTS akillesjanteen_kulma_vasen_aste  numeric,
  ADD COLUMN IF NOT EXISTS akillesjanteen_kulma_oikea_aste  numeric;
