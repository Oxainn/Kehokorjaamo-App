-- ============================================================
-- Migraatio: Yksi aktiivinen versio per lomakepohja
-- Päivämäärä: 2026-05-03
-- Tagi: [KIIRE-FIX 1]
--
-- Tausta:
--   Live-DB:ssä yhdellä lomakepohjalla ("Kalevalainen jäsenkorjaus")
--   havaittiin 8 riviä lomakepohja_versiot-taulussa, kaikki aktiivinen=true.
--   Pitäisi olla vain yksi aktiivinen kerrallaan. Tämä on rikkonut
--   palveluvalinnan ja lomakkeen avaamisen, koska runtime ottaa "uusimman
--   aktiivisen" eikä monoton-uusin = aktiivinen-pari pitänyt enää.
--
-- Korjaus:
--   1) Siivous: jokaiselle pohja_id:lle jää vain UUSIN versio aktiiviseksi.
--      Muut → aktiivinen=false. Käytetään DISTINCT ON jolla saadaan per
--      pohja_id viimeisin (ORDER BY pohja_id, luotu DESC) ja deaktivoidaan
--      kaikki muut aktiiviset rivit.
--   2) Partial unique index: takaa että jatkossa per pohja_id voi olla
--      vain yksi rivi jossa aktiivinen=true. Jos sovelluskoodi yrittäisi
--      tallentaa toisen aktiivisen rivin sulkematta vanhaa, INSERT
--      epäonnistuu DB-tasolla.
--
-- Ajojärjestys: siivous ENSIN, sitten unique-indeksi. Jos järjestys olisi
-- toisin päin ja duplikaatteja vielä olisi, indeksin luonti epäonnistuisi.
--
-- Idempotentti: voidaan ajaa useaan kertaan rikkomatta dataa.
--
-- Aja Supabase Dashboard → SQL Editor → New query → Aja
-- (sekä Kehitys- että Live-DB:hen)
-- ============================================================

-- ── 1. SIIVOUS — jätä per pohja_id vain uusin aktiiviseksi ──────────────────

UPDATE lomakepohja_versiot
   SET aktiivinen = false
 WHERE aktiivinen = true
   AND id NOT IN (
     SELECT DISTINCT ON (pohja_id) id
       FROM lomakepohja_versiot
      WHERE aktiivinen = true
      ORDER BY pohja_id, luotu DESC, versio DESC
   );

-- ── 2. PARTIAL UNIQUE INDEX — vain yksi aktiivinen per pohja_id ─────────────

CREATE UNIQUE INDEX IF NOT EXISTS ux_lomakepohja_versiot_yksi_aktiivinen
    ON lomakepohja_versiot (pohja_id)
 WHERE aktiivinen = true;

-- ── 3. TARKISTUS ────────────────────────────────────────────────────────────
-- Aja erikseen vahvistaaksesi tuloksen — pitäisi palauttaa rivit, joissa
-- count = 1 jokaiselle pohja_id:lle:

SELECT pohja_id, COUNT(*) AS aktiivisia
  FROM lomakepohja_versiot
 WHERE aktiivinen = true
 GROUP BY pohja_id
 ORDER BY aktiivisia DESC;
