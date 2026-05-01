-- ============================================================
-- Migraatio: B-lomakkeen (hoitokaynnit) tyhjä-tila + nullable pvm
-- Päivämäärä: 2026-05-01
--
-- A/B-lomake-terminologia:
--   A-lomake = asiakkaan täyttämä asiakastietolomake_versiot
--              (yksi voimassa oleva per asiakas, historia voimassa_asti-
--              kentällä)
--   B-lomake = hoitajan täyttämä hoitokaynnit
--              (yksi rivi per käynti)
--
-- Pala B1 lisäys: kun hoitaja vahvistaa asiakkaan ensimmäistä kertaa,
-- luodaan automaattisesti tyhjä B-lomake jolla on tila='odottaa_kayntia'
-- ja pvm=NULL. Tämä antaa "+ Uusi käynti"-toiminnolle valmiin pohjan
-- joka päivitetään tilaan='luonnos' + pvm=now() kun käynti aloitetaan.
--
-- Idempotentti.
-- ============================================================

ALTER TABLE hoitokaynnit ALTER COLUMN pvm DROP NOT NULL;

ALTER TABLE hoitokaynnit DROP CONSTRAINT IF EXISTS hoitokaynnit_tila_check;
ALTER TABLE hoitokaynnit ADD  CONSTRAINT hoitokaynnit_tila_check
  CHECK (tila = ANY (ARRAY['odottaa_kayntia'::text, 'luonnos'::text, 'valmis'::text]));

COMMENT ON COLUMN hoitokaynnit.tila IS
  'B-lomakkeen tila: odottaa_kayntia (tyhjä, asiakas vahvistettu mutta käyntiä ei pidetty), luonnos (käynnissä, hoitaja täyttää), valmis (tallennettu lopullisena).';

COMMENT ON COLUMN hoitokaynnit.pvm IS
  'Käynnin alkamisajankohta. NULL kun B-lomake on tyhjä (odottaa_kayntia-tilassa). Asetetaan now()-arvolle kun "+ Uusi käynti" avaa käynnin.';
