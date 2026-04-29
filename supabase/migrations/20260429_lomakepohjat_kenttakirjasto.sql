-- ============================================================
-- Migraatio: Lomakepohjat + Kenttäkirjasto
-- Vaihe A: Tietokantarakenne + 3 aloituspohjaa + 22 kenttää
-- Päivämäärä: 2026-04-29
--
-- Aja tämä Supabase SQL Editorissa:
-- Supabase Dashboard → SQL Editor → New query → Aja
-- ============================================================

-- ── 1. TAULUT ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lomakepohjat (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hoitaja_id uuid REFERENCES auth.users(id) NOT NULL,
  nimi       text NOT NULL,
  kuvaus     text,
  on_oletus  boolean DEFAULT false,
  aktiivinen boolean DEFAULT true,
  luotu      timestamptz DEFAULT now(),
  paivitetty timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lomakepohja_versiot (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pohja_id   uuid REFERENCES lomakepohjat(id) ON DELETE CASCADE NOT NULL,
  versio     integer NOT NULL,
  rakenne    jsonb NOT NULL,
  aktiivinen boolean DEFAULT true,
  luotu      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kenttakirjasto (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hoitaja_id         uuid REFERENCES auth.users(id) NOT NULL,
  kentta_id_tunniste text NOT NULL,
  kenttatyyppi       text NOT NULL,
  validointi         jsonb DEFAULT '{}'::jsonb,
  oletukset          jsonb DEFAULT '{}'::jsonb,
  luotu              timestamptz DEFAULT now(),
  UNIQUE (hoitaja_id, kentta_id_tunniste)
);

CREATE TABLE IF NOT EXISTS kentan_versiot (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kentta_id  uuid REFERENCES kenttakirjasto(id) ON DELETE CASCADE NOT NULL,
  versio     integer NOT NULL,
  kaannokset jsonb NOT NULL,
  aktiivinen boolean DEFAULT true,
  luotu      timestamptz DEFAULT now()
);

-- ── 2. RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE lomakepohjat        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lomakepohja_versiot ENABLE ROW LEVEL SECURITY;
ALTER TABLE kenttakirjasto      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kentan_versiot      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hoitaja omat lomakepohjat"        ON lomakepohjat;
DROP POLICY IF EXISTS "Hoitaja omat lomakepohja_versiot" ON lomakepohja_versiot;
DROP POLICY IF EXISTS "Hoitaja omat kenttakirjasto"      ON kenttakirjasto;
DROP POLICY IF EXISTS "Hoitaja omat kentan_versiot"      ON kentan_versiot;

CREATE POLICY "Hoitaja omat lomakepohjat" ON lomakepohjat
  FOR ALL USING (auth.uid() = hoitaja_id);

CREATE POLICY "Hoitaja omat lomakepohja_versiot" ON lomakepohja_versiot
  FOR ALL USING (
    pohja_id IN (SELECT id FROM lomakepohjat WHERE hoitaja_id = auth.uid())
  );

CREATE POLICY "Hoitaja omat kenttakirjasto" ON kenttakirjasto
  FOR ALL USING (auth.uid() = hoitaja_id);

CREATE POLICY "Hoitaja omat kentan_versiot" ON kentan_versiot
  FOR ALL USING (
    kentta_id IN (SELECT id FROM kenttakirjasto WHERE hoitaja_id = auth.uid())
  );

-- ── 3. MIGRAATIODATA ───────────────────────────────────────────────────────

DO $$
DECLARE
  v_uid       uuid;
  v_pid_c     uuid;
  v_pid_yksi  uuid;
  v_pid_acc   uuid;
  v_osiot     jsonb;
  v_kid       uuid;
BEGIN

  -- Hae Oxan käyttäjä-id
  SELECT id INTO v_uid FROM auth.users WHERE email = 'oxainn@gmail.com' LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Käyttäjää oxainn@gmail.com ei löydy auth.users-taulusta';
  END IF;

  -- Idempotentti: poista aiemmat ajotuloset (CASCADE hoitaa versiot)
  DELETE FROM lomakepohjat  WHERE hoitaja_id = v_uid;
  DELETE FROM kenttakirjasto WHERE hoitaja_id = v_uid;

  -- ── Osiorakenne (yhteinen kaikille kolmelle pohjalle) ─────────────────────

  v_osiot := '[
    {
      "id": "asiakastiedot",
      "jarjestys": 1,
      "otsikko": { "fi": "Asiakastiedot", "en": "Client information" },
      "kenttat": [
        { "kentta_id_tunniste": "etunimi",      "jarjestys": 1,  "pakollinen": true,  "ryhma": null },
        { "kentta_id_tunniste": "sukunimi",     "jarjestys": 2,  "pakollinen": true,  "ryhma": null },
        { "kentta_id_tunniste": "sahkoposti",   "jarjestys": 3,  "pakollinen": false, "ryhma": null },
        { "kentta_id_tunniste": "puhelin",      "jarjestys": 4,  "pakollinen": true,  "ryhma": null },
        { "kentta_id_tunniste": "syntymaaika",  "jarjestys": 5,  "pakollinen": true,  "ryhma": null },
        { "kentta_id_tunniste": "katuosoite",   "jarjestys": 6,  "pakollinen": false, "ryhma": "osoite" },
        { "kentta_id_tunniste": "postinumero",  "jarjestys": 7,  "pakollinen": false, "ryhma": "osoite" },
        { "kentta_id_tunniste": "kaupunki",     "jarjestys": 8,  "pakollinen": false, "ryhma": "osoite" },
        { "kentta_id_tunniste": "ammatti",      "jarjestys": 9,  "pakollinen": false, "ryhma": "lisatiedot" },
        { "kentta_id_tunniste": "harrastukset", "jarjestys": 10, "pakollinen": false, "ryhma": "lisatiedot" },
        { "kentta_id_tunniste": "pituus",       "jarjestys": 11, "pakollinen": false, "ryhma": "lisatiedot" },
        { "kentta_id_tunniste": "paino",        "jarjestys": 12, "pakollinen": false, "ryhma": "lisatiedot" }
      ],
      "ryhmittelyt": [
        {
          "id": "osoite",
          "otsikko": { "fi": "Osoite", "en": "Address" },
          "avattava": true,
          "kentat": ["katuosoite", "postinumero", "kaupunki"]
        },
        {
          "id": "lisatiedot",
          "otsikko": { "fi": "Lisätiedot", "en": "Additional information" },
          "avattava": true,
          "kentat": ["ammatti", "harrastukset", "pituus", "paino"]
        }
      ]
    },
    {
      "id": "sairaudet",
      "jarjestys": 2,
      "otsikko": { "fi": "Sairaudet ja terveys", "en": "Conditions and health" },
      "kenttat": [
        { "kentta_id_tunniste": "sairaudet",      "jarjestys": 1, "pakollinen": false, "ryhma": null },
        { "kentta_id_tunniste": "laakkeet",       "jarjestys": 2, "pakollinen": false, "ryhma": null },
        { "kentta_id_tunniste": "diagnoosit",     "jarjestys": 3, "pakollinen": false, "ryhma": null },
        { "kentta_id_tunniste": "vammat_huomiot", "jarjestys": 4, "pakollinen": false, "ryhma": null }
      ]
    },
    {
      "id": "hoitoon_tulon_syy",
      "jarjestys": 3,
      "otsikko": { "fi": "Hoitoon tulon syy", "en": "Reason for treatment" },
      "kenttat": [
        { "kentta_id_tunniste": "hoitoon_tulon_kuvaus", "jarjestys": 1, "pakollinen": false, "ryhma": null },
        { "kentta_id_tunniste": "kipuluku",             "jarjestys": 2, "pakollinen": false, "ryhma": null }
      ]
    },
    {
      "id": "kehonkartta",
      "jarjestys": 4,
      "otsikko": { "fi": "Asiakkaan kehonkartta", "en": "Client body map" },
      "kenttat": [
        { "kentta_id_tunniste": "kehonkartta_piirros", "jarjestys": 1, "pakollinen": false, "ryhma": null }
      ]
    },
    {
      "id": "suostumukset",
      "jarjestys": 5,
      "otsikko": { "fi": "Suostumukset", "en": "Consents" },
      "kenttat": [
        { "kentta_id_tunniste": "gdpr_hyvaksytty",   "jarjestys": 1, "pakollinen": true,  "ryhma": null },
        { "kentta_id_tunniste": "lupa_luovutukseen", "jarjestys": 2, "pakollinen": false, "ryhma": null },
        { "kentta_id_tunniste": "allekirjoitus",     "jarjestys": 3, "pakollinen": true,  "ryhma": null }
      ]
    }
  ]'::jsonb;

  -- ── Luo 3 lomakepohjaa ─────────────────────────────────────────────────

  INSERT INTO lomakepohjat (hoitaja_id, nimi, kuvaus, on_oletus)
  VALUES (v_uid,
    'Perus — C-tyyli',
    'Osio kerrallaan, navigointi nuolilla ja pyyhkäisyllä',
    true)
  RETURNING id INTO v_pid_c;

  INSERT INTO lomakepohjat (hoitaja_id, nimi, kuvaus, on_oletus)
  VALUES (v_uid,
    'Perus — Yksi sivu',
    'Kaikki osiot yhdellä sivulla rullaten',
    false)
  RETURNING id INTO v_pid_yksi;

  INSERT INTO lomakepohjat (hoitaja_id, nimi, kuvaus, on_oletus)
  VALUES (v_uid,
    'Perus — Avautuvat osiot',
    'Osiot accordion-tyylisesti, avautuvat klikkauksella',
    false)
  RETURNING id INTO v_pid_acc;

  -- ── Luo versio 1 jokaiselle pohjalle ──────────────────────────────────

  INSERT INTO lomakepohja_versiot (pohja_id, versio, rakenne)
  VALUES (v_pid_c, 1,
    jsonb_build_object('formaatti_versio', 1, 'nayttotyyli', 'c', 'osiot', v_osiot));

  INSERT INTO lomakepohja_versiot (pohja_id, versio, rakenne)
  VALUES (v_pid_yksi, 1,
    jsonb_build_object('formaatti_versio', 1, 'nayttotyyli', 'yksi_sivu', 'osiot', v_osiot));

  INSERT INTO lomakepohja_versiot (pohja_id, versio, rakenne)
  VALUES (v_pid_acc, 1,
    jsonb_build_object('formaatti_versio', 1, 'nayttotyyli', 'accordion', 'osiot', v_osiot));

  -- ── Kenttäkirjasto: 22 kenttää + käännökset ───────────────────────────

  -- 1. etunimi
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'etunimi', 'tekstirivi', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Etunimi","apurivi":"","placeholder":"Matti","virheilmoitus":"Etunimi on pakollinen"},"en":{"otsikko":"First name","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 2. sukunimi
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'sukunimi', 'tekstirivi', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Sukunimi","apurivi":"","placeholder":"Meikäläinen","virheilmoitus":"Sukunimi on pakollinen"},"en":{"otsikko":"Last name","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 3. sahkoposti
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'sahkoposti', 'sahkoposti', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Sähköposti","apurivi":"","placeholder":"matti@esimerkki.fi","virheilmoitus":""},"en":{"otsikko":"Email","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 4. puhelin
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'puhelin', 'puhelin', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Puhelin","apurivi":"","placeholder":"+358 40 123 4567","virheilmoitus":"Puhelinnumero on pakollinen"},"en":{"otsikko":"Phone","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 5. syntymaaika
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'syntymaaika', 'paivamaara', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Syntymäaika","apurivi":"","placeholder":"","virheilmoitus":"Syntymäaika on pakollinen"},"en":{"otsikko":"Date of birth","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 6. katuosoite
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'katuosoite', 'tekstirivi', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Katuosoite","apurivi":"","placeholder":"Esimerkkikatu 1","virheilmoitus":""},"en":{"otsikko":"Street address","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 7. postinumero
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'postinumero', 'tekstirivi', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Postinumero","apurivi":"","placeholder":"00100","virheilmoitus":""},"en":{"otsikko":"Postal code","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 8. kaupunki
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'kaupunki', 'tekstirivi', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Kaupunki","apurivi":"","placeholder":"Helsinki","virheilmoitus":""},"en":{"otsikko":"City","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 9. ammatti
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'ammatti', 'tekstirivi', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Ammatti","apurivi":"","placeholder":"","virheilmoitus":""},"en":{"otsikko":"Occupation","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 10. harrastukset
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'harrastukset', 'tekstikentta', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Harrastukset","apurivi":"","placeholder":"","virheilmoitus":""},"en":{"otsikko":"Hobbies","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 11. pituus
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'pituus', 'numero', '{"min":100,"max":250}', '{"yksikko":"cm","nayta_yksikko":true}')
  RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Pituus","apurivi":"","placeholder":"175","virheilmoitus":""},"en":{"otsikko":"Height","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 12. paino
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'paino', 'numero', '{"min":20,"max":300}', '{"yksikko":"kg","nayta_yksikko":true}')
  RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Paino","apurivi":"","placeholder":"72","virheilmoitus":""},"en":{"otsikko":"Weight","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 13. sairaudet
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'sairaudet', 'checkbox_lista', '{"lahde":"sairaustyypit_taulu"}', '{}')
  RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Sairaudet ja terveys","apurivi":"Rastita kaikki jotka koskevat sinua","placeholder":"","virheilmoitus":""},"en":{"otsikko":"Conditions and health","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 14. laakkeet
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'laakkeet', 'tekstikentta', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Lääkitys","apurivi":"","placeholder":"","virheilmoitus":""},"en":{"otsikko":"Regular medication","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 15. diagnoosit
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'diagnoosit', 'tekstikentta', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Diagnosoidut sairaudet","apurivi":"","placeholder":"","virheilmoitus":""},"en":{"otsikko":"Diagnosed conditions","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 16. vammat_huomiot
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'vammat_huomiot', 'tekstikentta', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Vammat ja muut huomiot","apurivi":"","placeholder":"","virheilmoitus":""},"en":{"otsikko":"Injuries and other notes","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 17. hoitoon_tulon_kuvaus
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'hoitoon_tulon_kuvaus', 'tekstikentta', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Oireet ja tilanne","apurivi":"Kuvaile oireitasi ja mistä ne tuntuvat","placeholder":"","virheilmoitus":""},"en":{"otsikko":"Reason for treatment","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 18. kipuluku (liukusaadin, 0-10, värikoodaus)
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (
    v_uid, 'kipuluku', 'liukusaadin',
    '{"min":0,"max":10}',
    '{"askel":1,"varikoodaus":"vihrea_keltainen_punainen","ohjeet":{"min":{"fi":"ei kipua","en":"no pain"},"max":{"fi":"sietämätön","en":"unbearable"}}}'
  ) RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Kipuluku nyt","apurivi":"0 = ei kipua, 10 = sietämätön","placeholder":"","virheilmoitus":""},"en":{"otsikko":"Pain level now","apurivi":"0 = no pain, 10 = unbearable","placeholder":"","virheilmoitus":""}}');

  -- 19. kehonkartta_piirros
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'kehonkartta_piirros', 'kehonkartta', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Kehonkartta","apurivi":"Piirrä sormella tai hiirellä alueet joissa tunnet oireita","placeholder":"","virheilmoitus":""},"en":{"otsikko":"Body map","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 20. gdpr_hyvaksytty
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'gdpr_hyvaksytty', 'checkbox', '{"pakollinen":true}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Hyväksyn tietojeni käsittelyn","apurivi":"Antamiani tietoja käytetään hoitosuhteen toteuttamiseen.","placeholder":"","virheilmoitus":"Suostumus tietojенkäsittelyyn on pakollinen"},"en":{"otsikko":"Privacy policy accepted","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 21. lupa_luovutukseen
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'lupa_luovutukseen', 'checkbox', '{}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Annan luvan tietojen luovuttamiseen hoitoon osallistuville","apurivi":"Esimerkiksi konsultaatio toisen hoitajan kanssa.","placeholder":"","virheilmoitus":""},"en":{"otsikko":"Permission to share information with care providers","apurivi":"","placeholder":"","virheilmoitus":""}}');

  -- 22. allekirjoitus
  INSERT INTO kenttakirjasto (hoitaja_id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset)
  VALUES (v_uid, 'allekirjoitus', 'allekirjoitus', '{"vaatii_piirron":true}', '{}') RETURNING id INTO v_kid;
  INSERT INTO kentan_versiot (kentta_id, versio, kaannokset) VALUES (v_kid, 1,
    '{"fi":{"otsikko":"Allekirjoitus","apurivi":"Piirrä allekirjoitus sormella tai hiirellä","placeholder":"","virheilmoitus":"Allekirjoitus on pakollinen"},"en":{"otsikko":"Signature","apurivi":"","placeholder":"","virheilmoitus":""}}');

  RAISE NOTICE 'Migraatio valmis. hoitaja_id: %', v_uid;

END $$;

-- ── 4. TARKISTUS ──────────────────────────────────────────────────────────
-- Aja nämä erikseen tarkistaaksesi tulokset:

SELECT id, nimi, on_oletus, aktiivinen FROM lomakepohjat ORDER BY luotu;

SELECT lv.versio, lp.nimi, lv.rakenne->>'nayttotyyli' AS tyyli
  FROM lomakepohja_versiot lv
  JOIN lomakepohjat lp ON lp.id = lv.pohja_id
  ORDER BY lp.luotu;

SELECT kentta_id_tunniste, kenttatyyppi FROM kenttakirjasto ORDER BY luotu;

SELECT COUNT(*) AS kentan_versioita FROM kentan_versiot;
