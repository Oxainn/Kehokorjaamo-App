-- Pala 2.11 (2026-05-05): kenttakirjasto.kohderyhma
--
-- Lisää tieto siitä kummalle roolille kenttä on tarkoitettu:
--   'asiakas' = kenttä jonka asiakas täyttää (etunimi, oireet jne.)
--   'hoitaja' = kenttä jonka hoitaja täyttää (BodyMap-havainnot, mittarit jne.)
--
-- Käytetään LisaaKenttaModaali:n ryhmittelyssä — aiempi kenttätyyppi-pohjainen
-- suodatus (HOITAJAN_KENTTATYYPIT-set) korvautuu eksplisiittisellä DB-arvolla.
-- Tämä antaa joustavuutta: esim. tekstirivi voi olla joko asiakas (etunimi)
-- tai hoitaja ("oma huomio") kontekstista riippuen.
--
-- Default 'asiakas' takaa että vanhat rivit toimivat ennallaan ilman päivitystä.
-- Hoitajan kentät (kuvantaminen, linjausmittari, bodymap_havainnot,
-- itsehoito_valinnat, ai_loydosanalyysi, edellisen_kaynnin_muista) päivitetään
-- 'hoitaja'-arvolla migraation lopussa.

ALTER TABLE public.kenttakirjasto
  ADD COLUMN IF NOT EXISTS kohderyhma text NOT NULL DEFAULT 'asiakas';

ALTER TABLE public.kenttakirjasto
  DROP CONSTRAINT IF EXISTS kenttakirjasto_kohderyhma_check;

ALTER TABLE public.kenttakirjasto
  ADD CONSTRAINT kenttakirjasto_kohderyhma_check
  CHECK (kohderyhma IN ('asiakas', 'hoitaja'));

-- Päivitä olemassa olevat hoitajan kentät kerralla.
-- Tunnistus kenttätyyppien perusteella — sama lista kuin koodin
-- HOITAJAN_KENTTATYYPIT-set:issä (LisaaKenttaModaali.jsx).
UPDATE public.kenttakirjasto
SET kohderyhma = 'hoitaja'
WHERE kenttatyyppi IN (
  'kuvantaminen',
  'linjausmittari',
  'bodymap_havainnot',
  'itsehoito_valinnat',
  'ai_loydosanalyysi',
  'edellisen_kaynnin_muista'
)
AND kohderyhma <> 'hoitaja';

-- Indeksi suodatuskyselyille (LisaaKenttaModaali hakee usein hoitaja_id + kohderyhma)
CREATE INDEX IF NOT EXISTS idx_kenttakirjasto_kohderyhma
  ON public.kenttakirjasto (hoitaja_id, kohderyhma);
