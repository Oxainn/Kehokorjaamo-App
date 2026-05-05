-- Pala 2.24 (2026-05-05): hoitokaynnit.lomakepohja_versio_id
--
-- Lisää viittaus pohjan versioon jolla käynnin lomake renderöitiin.
-- Snapshot-malli: vaikka editorissa luodaan uudempia versioita, vanhojen
-- käyntien lomakkeet renderöityvät alkuperäisellä pohjarakenteella.
--
-- KayntiLomakeNakyma käyttää tätä avatessaan käynnin uudelleen lomake-
-- runtimella read-only -tilassa (tila='valmis').

ALTER TABLE public.hoitokaynnit
  ADD COLUMN IF NOT EXISTS lomakepohja_versio_id uuid
  REFERENCES public.lomakepohja_versiot(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hoitokaynnit_lomakepohja_versio
  ON public.hoitokaynnit (lomakepohja_versio_id);
