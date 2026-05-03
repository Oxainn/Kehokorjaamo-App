-- AB-T4a: A+B-yhdistetyn lomakkeen tallennusmalli (Vaihtoehto Z = hybrid)
--
-- Muutokset:
--   1. hoitokaynnit.vastaukset jsonb       — koko lomake-vastaukset yhtenä
--                                            objektina (avain = kentta_id_tunniste)
--   2. hoitokaynnit.avattu_uudelleen_kerralla integer  — laskuri uudelleen-
--                                            avauksille (lukutila → muokattava)
--   3. hoitokaynnit.avattu_uudelleen_kasittely jsonb — auditin loki:
--                                            [{ pvm, hoitaja_id, syy? }, ...]
--   4. lomake_sairaudet.hoitokaynti_id uuid  — sairaudet linkkautuvat suoraan
--                                            hoitokayntiin uudessa mallissa
--                                            (vanhat rivit jäävät käyttämään
--                                            lomake_versio_id:tä)
--
-- Yhteensopivuus: vanhat käynnit (ennen AB-T4) säilyttävät rakenteen — niillä
-- vastaukset on tyhjä '{}'::jsonb ja data luetaan asiakastietolomake_versiot-
-- taulun kautta. haeKayntiVastauksilla-funktio osaa molemmat polut.
--
-- Idempotency: kaikki ALTER ... ADD COLUMN IF NOT EXISTS — turvallinen
-- ajaa uudestaan.

ALTER TABLE hoitokaynnit
  ADD COLUMN IF NOT EXISTS vastaukset jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN hoitokaynnit.vastaukset IS
  'A+B-yhdistetyn lomakkeen vastaukset (AB-T4). Avain = kentta_id_tunniste, arvo = kentän arvo. Vanhojen käyntien sarake on {} ja data luetaan asiakastietolomake_versiot-taulusta.';

ALTER TABLE hoitokaynnit
  ADD COLUMN IF NOT EXISTS avattu_uudelleen_kerralla integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN hoitokaynnit.avattu_uudelleen_kerralla IS
  'Laskuri: kuinka monta kertaa valmis-tilainen käynti on avattu uudelleen muokattavaksi (AB-T4c lukitus). 0 = ei koskaan avattu.';

ALTER TABLE hoitokaynnit
  ADD COLUMN IF NOT EXISTS avattu_uudelleen_kasittely jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN hoitokaynnit.avattu_uudelleen_kasittely IS
  'Loki uudelleenavauksista: [{pvm, hoitaja_id, syy?}, ...]. Snapshot-mallin auditin jälki — joka avauksen jälki säilyy.';

ALTER TABLE lomake_sairaudet
  ADD COLUMN IF NOT EXISTS hoitokaynti_id uuid REFERENCES hoitokaynnit(id) ON DELETE CASCADE;

COMMENT ON COLUMN lomake_sairaudet.hoitokaynti_id IS
  'AB-T4: linkitys hoitokayntiin uudessa mallissa. Vanhat rivit (ennen AB-T4) viittaavat lomake_versio_id:llä asiakastietolomake_versiot-tauluun. Yksi näistä on aina set, ei molempia.';

CREATE INDEX IF NOT EXISTS idx_lomake_sairaudet_hoitokaynti
  ON lomake_sairaudet(hoitokaynti_id)
  WHERE hoitokaynti_id IS NOT NULL;
