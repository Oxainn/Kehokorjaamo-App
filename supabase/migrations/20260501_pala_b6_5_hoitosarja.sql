-- ============================================================
-- Migraatio: Vaihe B Pala B6.5 — Hoitosarjan logiikka
-- Päivämäärä: 2026-05-01
-- ============================================================

ALTER TABLE palvelut
  ADD COLUMN IF NOT EXISTS hoitosarjan_pituus integer
  CHECK (hoitosarjan_pituus IS NULL OR hoitosarjan_pituus BETWEEN 1 AND 50);

UPDATE palvelut SET hoitosarjan_pituus = 3
WHERE  hoitosarjan_pituus IS NULL AND aktiivinen = true;

COMMENT ON COLUMN palvelut.hoitosarjan_pituus IS
  'Palvelun suositeltu hoitosarjan pituus käyntien lukumääränä. NULL = ei sarjalogiikkaa, näytä vain "Käynti N".';

ALTER TABLE hoitokaynnit
  ADD COLUMN IF NOT EXISTS seuraava_kaynti_pvm date;

COMMENT ON COLUMN hoitokaynnit.seuraava_kaynti_pvm IS
  'Seuraavan käynnin ehdotettu pvm. Hoitokirjaus-näkymässä esitäyttyy +7 vrk:n päähän, hoitaja voi muuttaa.';
