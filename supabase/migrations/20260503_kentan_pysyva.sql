-- AB-T1a: lisää 'pysyva' boolean -sarake kentan_versiot-tauluun.
--
-- Semantiikka:
--   pysyva = true  → kentän arvo säilyy "Aloita uusi käynti" -toiminnon
--                    jälkeen (asiakkaan perustiedot, sairaudet, harrastukset)
--   pysyva = false → kenttä tyhjennetään uuden käynnin alussa (päivän kipu,
--                    hoidon kulku, mittausarvot)
--
-- Default false: hoitaja merkitsee pysyväksi yksitellen lomakepohjaeditorissa.
-- "Pysyvä" on poikkeus, "muuttuva" on tavallinen tila.
--
-- Käyttöpiste: AB-T3:n runtime-logiikka lukee tämän kun "+ Aloita uusi käynti"
-- klikataan ja päättää mitkä kentät tyhjennetään.

ALTER TABLE kentan_versiot
  ADD COLUMN IF NOT EXISTS pysyva boolean NOT NULL DEFAULT false;
