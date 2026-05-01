-- VB4: DB-puolen CHECK-constraintit kullekin 15 linjausmittarille.
-- Raja-arvot vastaavat src/data/linjausmittarit.js:n min/max-arvoja.
-- NULL = ei mitattu (sallittu), muuten arvon pitää olla välillä.

ALTER TABLE public.hoitokaynnit
  ADD CONSTRAINT lantion_kallistus_range
    CHECK (lantion_kallistus_aste IS NULL OR (lantion_kallistus_aste >= -10 AND lantion_kallistus_aste <= 20)),
  ADD CONSTRAINT lantion_sivuttainen_range
    CHECK (lantion_sivuttainen_aste IS NULL OR (lantion_sivuttainen_aste >= -10 AND lantion_sivuttainen_aste <= 10)),
  ADD CONSTRAINT lantion_kierto_range
    CHECK (lantion_kierto_aste IS NULL OR (lantion_kierto_aste >= -15 AND lantion_kierto_aste <= 15)),
  ADD CONSTRAINT olkapaiden_korkeusero_range
    CHECK (olkapaiden_korkeusero_cm IS NULL OR (olkapaiden_korkeusero_cm >= -3 AND olkapaiden_korkeusero_cm <= 3)),
  ADD CONSTRAINT paan_eteen_tyontyminen_range
    CHECK (paan_eteen_tyontyminen_cm IS NULL OR (paan_eteen_tyontyminen_cm >= 0 AND paan_eteen_tyontyminen_cm <= 10)),
  ADD CONSTRAINT q_kulma_vasen_range
    CHECK (q_kulma_vasen_aste IS NULL OR (q_kulma_vasen_aste >= 0 AND q_kulma_vasen_aste <= 30)),
  ADD CONSTRAINT q_kulma_oikea_range
    CHECK (q_kulma_oikea_aste IS NULL OR (q_kulma_oikea_aste >= 0 AND q_kulma_oikea_aste <= 30)),
  ADD CONSTRAINT skolioosin_kierto_range
    CHECK (skolioosin_kierto_aste IS NULL OR (skolioosin_kierto_aste >= 0 AND skolioosin_kierto_aste <= 20)),
  ADD CONSTRAINT niskan_kaannos_vasen_range
    CHECK (niskan_kaannos_vasen_aste IS NULL OR (niskan_kaannos_vasen_aste >= 0 AND niskan_kaannos_vasen_aste <= 90)),
  ADD CONSTRAINT niskan_kaannos_oikea_range
    CHECK (niskan_kaannos_oikea_aste IS NULL OR (niskan_kaannos_oikea_aste >= 0 AND niskan_kaannos_oikea_aste <= 90)),
  ADD CONSTRAINT jalkapituus_ero_range
    CHECK (jalkapituus_ero_cm IS NULL OR (jalkapituus_ero_cm >= -2 AND jalkapituus_ero_cm <= 2)),
  ADD CONSTRAINT navicular_drop_vasen_range
    CHECK (navicular_drop_vasen_mm IS NULL OR (navicular_drop_vasen_mm >= 0 AND navicular_drop_vasen_mm <= 20)),
  ADD CONSTRAINT navicular_drop_oikea_range
    CHECK (navicular_drop_oikea_mm IS NULL OR (navicular_drop_oikea_mm >= 0 AND navicular_drop_oikea_mm <= 20)),
  ADD CONSTRAINT akillesjanteen_kulma_vasen_range
    CHECK (akillesjanteen_kulma_vasen_aste IS NULL OR (akillesjanteen_kulma_vasen_aste >= -15 AND akillesjanteen_kulma_vasen_aste <= 15)),
  ADD CONSTRAINT akillesjanteen_kulma_oikea_range
    CHECK (akillesjanteen_kulma_oikea_aste IS NULL OR (akillesjanteen_kulma_oikea_aste >= -15 AND akillesjanteen_kulma_oikea_aste <= 15)),
  ADD CONSTRAINT kesto_min_range
    CHECK (kesto_min IS NULL OR (kesto_min >= 0 AND kesto_min <= 600));
