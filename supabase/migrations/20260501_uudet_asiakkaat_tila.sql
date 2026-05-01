-- ============================================================
-- Migraatio: Asiakkaiden "vahvistettu"-tila
-- Päivämäärä: 2026-05-01
--
-- Lisää asiakkaat.vahvistettu boolean -sarakkeen jolla erotetaan:
--   - Hoitajan vahvistamat asiakkaat (vahvistettu = true) — näkyvät
--     normaalissa asiakaslistassa, voivat osallistua hoitokäynteihin
--   - Julkisen lomakkeen kautta tulleet uudet asiakkaat (vahvistettu = false)
--     — odottavat hoitajan tarkistusta ja vahvistusta
--
-- Olemassa oleva data: kaikki nykyiset asiakkaat oletetaan vahvistetuiksi
-- (oletusarvo true sarakkeen lisäysvaiheessa). Sen jälkeen oletus vaihdetaan
-- false:ksi jotta uudet rivit (julkisen lomakkeen kautta tulevat) saavat
-- automaattisesti false:n.
--
-- Aja Supabase Dashboard → SQL Editor → New query → Aja.
-- Idempotentti: voi ajaa puhtaaseen DB:hen tai olemassa olevaan.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'asiakkaat'
      AND column_name  = 'vahvistettu'
  ) THEN
    -- Vaihe 1: Lisää sarake oletuksella TRUE — olemassa olevat rivit
    -- merkitään vahvistetuiksi yhdellä operaatiolla.
    ALTER TABLE asiakkaat
      ADD COLUMN vahvistettu boolean NOT NULL DEFAULT true;

    -- Vaihe 2: Vaihda oletus FALSE:ksi jotta jatkossa uudet rivit
    -- (Edge Function `tallenna-julkinen-lomake`) saavat false:n ellei
    -- eksplisiittisesti aseteta.
    ALTER TABLE asiakkaat
      ALTER COLUMN vahvistettu SET DEFAULT false;
  END IF;
END $$;

-- Hakuoptimointi: Asiakasrekisteri-näkymä suodattaa hoitaja_id + vahvistettu
-- yhdistelmällä jokaisella latauksella.
CREATE INDEX IF NOT EXISTS asiakkaat_vahvistettu_idx
  ON asiakkaat(hoitaja_id, vahvistettu);

-- Tarkistus
SELECT
  COUNT(*) FILTER (WHERE vahvistettu = true)  AS vahvistettuja,
  COUNT(*) FILTER (WHERE vahvistettu = false) AS odottaa_vahvistusta
FROM asiakkaat;
