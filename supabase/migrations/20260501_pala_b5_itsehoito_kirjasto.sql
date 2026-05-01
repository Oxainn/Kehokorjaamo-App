-- ============================================================
-- Migraatio: Vaihe B Pala B5 — Itsehoito-kirjasto
-- Päivämäärä: 2026-05-01
--
-- Hoitajan ylläpitämä yleisten harjoitusten varasto. Erotettu
-- olemassa olevasta itsehoito_harjoitukset-taulusta (joka on
-- asiakas-spesifinen ohjelma_id:llä). Pala B6:ssa hoitaja
-- valitsee tästä asiakkaan itsehoito-ohjelmaan.
-- ============================================================

CREATE TABLE IF NOT EXISTS itsehoito_kirjasto (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hoitaja_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nimi         text NOT NULL CHECK (length(nimi) <= 80),
  lyhyt_kuvaus text,
  pitka_ohje   text,
  kohdealueet  text[] DEFAULT '{}',
  kesto_min    integer,
  toistot      text,
  frekvenssi   text,
  varoitukset  text,
  kuva_url     text,
  video_url    text,
  arkistoitu   boolean NOT NULL DEFAULT false,
  luotu        timestamptz NOT NULL DEFAULT now(),
  paivitetty   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS itsehoito_kirjasto_hoitaja_idx
  ON itsehoito_kirjasto(hoitaja_id, arkistoitu);

ALTER TABLE itsehoito_kirjasto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hoitaja omat itsehoito_kirjasto" ON itsehoito_kirjasto;
CREATE POLICY "Hoitaja omat itsehoito_kirjasto" ON itsehoito_kirjasto
  FOR ALL USING (auth.uid() = hoitaja_id);

COMMENT ON TABLE itsehoito_kirjasto IS
  'Hoitajan ylläpitämä yleisten itsehoito-harjoitusten kirjasto. Pala B6:ssa hoitaja valitsee tästä asiakaskohtaiseen ohjelmaan.';
