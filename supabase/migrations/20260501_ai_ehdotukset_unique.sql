-- Vaihe B tarkistus — yksi AI-analyysi (per tyyppi) per käynti.
-- Mahdollistaa upsert-pohjaisen tallennuksen, jolloin delete+insert
-- -racea ei tarvita.
ALTER TABLE public.ai_ehdotukset
  ADD CONSTRAINT ai_ehdotukset_kaynti_tyyppi_uniq
  UNIQUE (hoitokaynti_id, tyyppi);
