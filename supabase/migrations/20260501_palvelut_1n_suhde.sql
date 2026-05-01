-- ============================================================
-- Migraatio: Palvelut-taulu + 1:N-suhde lomakepohjiin
-- Päivämäärä: 2026-05-01
--
-- Tämä migraatio:
--  1. Varmistaa että palvelut-taulu on olemassa (reverse-engineer
--     tuotannosta — taulua ei luotu aiemmilla migraatioilla, vaan se
--     oli rakennettu suoraan Supabasen UI:n kautta).
--  2. Varmistaa että palvelu_lomake_linkit-välitaulu on olemassa
--     siirtymisen ajaksi (jätetään pois lopussa).
--  3. Siirtää suhteen N:M → 1:N: lisää sarakkeen palvelut.lomakepohja_id,
--     migroi olemassa olevan datan (jokaiselle palvelulle se pohja
--     joka on merkitty oletukseksi), ja pudottaa välitaulun.
--
-- Aja Supabase Dashboard → SQL Editor → New query → Aja.
-- Idempotentti: voi ajaa puhtaaseen DB:hen tai olemassa olevaan.
-- ============================================================

-- ── 1. PALVELUT-taulu (jos puuttuu) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS palvelut (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hoitaja_id       uuid REFERENCES auth.users(id) NOT NULL,
  nimi             text NOT NULL,
  kuvaus           text,
  kesto_min        integer,
  hinta_eur        numeric(8, 2),
  varauslinkki_url text,
  jarjestys        integer,
  aktiivinen       boolean DEFAULT true,
  luotu            timestamptz DEFAULT now(),
  paivitetty       timestamptz DEFAULT now()
);

ALTER TABLE palvelut ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hoitaja omat palvelut" ON palvelut;
CREATE POLICY "Hoitaja omat palvelut" ON palvelut
  FOR ALL USING (auth.uid() = hoitaja_id);

CREATE INDEX IF NOT EXISTS palvelut_hoitaja_idx ON palvelut(hoitaja_id);

-- ── 2. PALVELU_LOMAKE_LINKIT välitaulu (siirtymisen ajaksi) ───────────────
-- Tämä saatetaan luoda nyt vain jotta UPDATE-vaihe ei kaadu jos taulu
-- puuttuu. Lopussa se pudotetaan kaiken tapauksessa.

CREATE TABLE IF NOT EXISTS palvelu_lomake_linkit (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  palvelu_id uuid REFERENCES palvelut(id)     ON DELETE CASCADE NOT NULL,
  pohja_id   uuid REFERENCES lomakepohjat(id) ON DELETE CASCADE NOT NULL,
  on_oletus  boolean DEFAULT false,
  luotu      timestamptz DEFAULT now(),
  UNIQUE (palvelu_id, pohja_id)
);

ALTER TABLE palvelu_lomake_linkit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hoitaja omat palvelu_lomake_linkit" ON palvelu_lomake_linkit;
CREATE POLICY "Hoitaja omat palvelu_lomake_linkit" ON palvelu_lomake_linkit
  FOR ALL USING (
    palvelu_id IN (SELECT id FROM palvelut WHERE hoitaja_id = auth.uid())
  );

-- ── 3. Lisää lomakepohja_id-sarake palvelut-tauluun ───────────────────────

ALTER TABLE palvelut
  ADD COLUMN IF NOT EXISTS lomakepohja_id uuid REFERENCES lomakepohjat(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS palvelut_lomakepohja_idx ON palvelut(lomakepohja_id);

-- ── 4. Migroi data: jokaiselle palvelulle se pohja joka oli oletus ────────
-- Jos palvelulla on useita linkkejä, valitaan oletukseksi merkitty.
-- Jos yksikään ei ole merkitty oletukseksi, valitaan ensimmäinen luotu.
-- Päivitetään vain palveluja joiden lomakepohja_id on vielä null
-- (idempotentti: ajaminen uudestaan ei ylikirjoita).

UPDATE palvelut p
SET    lomakepohja_id = sub.pohja_id
FROM (
  SELECT DISTINCT ON (palvelu_id)
         palvelu_id,
         pohja_id
  FROM   palvelu_lomake_linkit
  ORDER  BY palvelu_id, on_oletus DESC, luotu ASC
) sub
WHERE  sub.palvelu_id = p.id
  AND  p.lomakepohja_id IS NULL;

-- ── 5. Pudota välitaulu ───────────────────────────────────────────────────

DROP TABLE IF EXISTS palvelu_lomake_linkit;

-- ── 6. Tarkistus ──────────────────────────────────────────────────────────

SELECT
  p.id,
  p.nimi               AS palvelu,
  p.aktiivinen,
  lp.nimi              AS lomakepohja,
  p.lomakepohja_id     AS pohja_id
FROM palvelut p
LEFT JOIN lomakepohjat lp ON lp.id = p.lomakepohja_id
ORDER BY p.luotu;
