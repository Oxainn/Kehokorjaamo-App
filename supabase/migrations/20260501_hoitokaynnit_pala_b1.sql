-- ============================================================
-- Migraatio: hoitokaynnit-taulun kentät Vaihe B Pala B1:tä varten
-- Päivämäärä: 2026-05-01
--
-- Lisää otsikko + hoitajan_kommentit -sarakkeet hoitokaynnit-tauluun
-- jotta hoitaja voi kirjata käynnin perustiedot uudessa
-- Hoitokirjaus-näkymässä.
--
-- Mappaus Pala B1:n vaatimien kenttien ja hoitokaynnit-taulun välillä:
--   - "Käynnin otsikko"      → otsikko (uusi sarake, max 50 merkkiä)
--   - "Mitä hoidettiin"      → hoidon_kulku (jo olemassa)
--   - "Hoitajan kommentit"   → hoitajan_kommentit (uusi sarake)
--
-- muista_ensi_kerralla-sarake säilyy ennallaan eri tarkoitukseen
-- (muistutus seuraavaa kertaa varten, ei tämän käynnin kommentti).
-- Idempotentti.
-- ============================================================

ALTER TABLE hoitokaynnit
  ADD COLUMN IF NOT EXISTS otsikko text
  CHECK (otsikko IS NULL OR length(otsikko) <= 50);

ALTER TABLE hoitokaynnit
  ADD COLUMN IF NOT EXISTS hoitajan_kommentit text;

COMMENT ON COLUMN hoitokaynnit.otsikko IS
  'Käynnin lyhyt otsikko (max 50 merkkiä). Sama konsepti kuin asiakastietolomake_versiot.otsikko mutta hoitajan näkökulmasta.';

COMMENT ON COLUMN hoitokaynnit.hoitajan_kommentit IS
  'Hoitajan vapaamuotoiset huomiot tästä käynnistä. Erikseen muista_ensi_kerralla-kentästä joka on muistutus seuraavaa kertaa varten.';
