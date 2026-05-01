-- ============================================================
-- Migraatio: Vaihe B Pala B6 — Käyntikohtaiset itsehoito-valinnat
-- Päivämäärä: 2026-05-01
-- ============================================================

CREATE TABLE IF NOT EXISTS itsehoito_kaynnin_valinnat (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hoitokaynti_id        uuid NOT NULL REFERENCES hoitokaynnit(id) ON DELETE CASCADE,
  kirjasto_harjoitus_id uuid NOT NULL REFERENCES itsehoito_kirjasto(id) ON DELETE CASCADE,
  jarjestys             integer NOT NULL DEFAULT 0,
  toistot_muokattu      text,
  frekvenssi_muokattu   text,
  lisahuomautus         text,
  luotu                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS itsehoito_kaynnin_valinnat_hoitokaynti_idx
  ON itsehoito_kaynnin_valinnat(hoitokaynti_id);

ALTER TABLE itsehoito_kaynnin_valinnat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hoitaja omat itsehoito_kaynnin_valinnat" ON itsehoito_kaynnin_valinnat;
CREATE POLICY "Hoitaja omat itsehoito_kaynnin_valinnat" ON itsehoito_kaynnin_valinnat
  FOR ALL USING (
    hoitokaynti_id IN (SELECT id FROM hoitokaynnit WHERE hoitaja_id = auth.uid())
  );

COMMENT ON TABLE itsehoito_kaynnin_valinnat IS
  'Käyntikohtaiset itsehoito-valinnat — hoitaja valitsee tähän tauluun harjoituksia itsehoito_kirjasto-taulusta jokaiselle hoitokerralle, räätälöiden toistot/frekvenssin tarpeen mukaan.';
