-- Migraatio: lisää ryhma, tarkenne_label, tarkenne_tyyppi sairaus_tyypit-tauluun
-- Aja tämä Supabase SQL Editorissa (Settings → SQL Editor → New query)

ALTER TABLE sairaus_tyypit
  ADD COLUMN IF NOT EXISTS ryhma          text,
  ADD COLUMN IF NOT EXISTS tarkenne_label text,
  ADD COLUMN IF NOT EXISTS tarkenne_tyyppi text;

UPDATE sairaus_tyypit SET
  ryhma = CASE nimi
    WHEN 'Allergia'                THEN 'YLEISET'
    WHEN 'Astma/hengenahdistus'    THEN 'YLEISET'
    WHEN 'Diabetes'                THEN 'YLEISET'
    WHEN 'Migreeni'                THEN 'YLEISET'
    WHEN 'Kaulavaltimon ahtauma'   THEN 'SYDÄN JA VERENKIERTO'
    WHEN 'Sydänsairauksia'         THEN 'SYDÄN JA VERENKIERTO'
    WHEN 'Verenohennuslääkitys'    THEN 'SYDÄN JA VERENKIERTO'
    WHEN 'Verenpaine'              THEN 'SYDÄN JA VERENKIERTO'
    WHEN 'Hermojuuriaukon ahtauma' THEN 'SELKÄRANKA JA NIVELET'
    WHEN 'Osteoporoosi'            THEN 'SELKÄRANKA JA NIVELET'
    WHEN 'Reuma'                   THEN 'SELKÄRANKA JA NIVELET'
    WHEN 'Spondylolyysi/-listeesi' THEN 'SELKÄRANKA JA NIVELET'
    WHEN 'Tekonivel'               THEN 'SELKÄRANKA JA NIVELET'
    WHEN 'Epilepsia'               THEN 'NEUROLOGISET'
    WHEN 'Raskaus'                 THEN 'NAINEN'
    WHEN 'Masennus'                THEN 'MIELENTERVEYS'
    WHEN 'Psyykkinen sairaus'      THEN 'MIELENTERVEYS'
    WHEN 'Kilpirauhasen sairauksia' THEN 'MUUT'
    WHEN 'Verisuoniproteesi'       THEN 'ESTE HOIDOLLE'
    WHEN 'Tarttuva (iho)tauti'     THEN 'ESTE HOIDOLLE'
    WHEN 'Tulehdus/kuume'          THEN 'ESTE HOIDOLLE'
    WHEN 'Kasvain/syöpä'           THEN 'ESTE HOIDOLLE'
    WHEN 'Tuore vamma'             THEN 'ESTE HOIDOLLE'
    WHEN 'Vyöruusu'                THEN 'ESTE HOIDOLLE'
    ELSE 'MUUT'
  END,
  tarkenne_label = CASE nimi
    WHEN 'Allergia'        THEN 'Mille'
    WHEN 'Verenpaine'      THEN 'Matala / Korkea'
    WHEN 'Sydänsairauksia' THEN 'Mikä'
    WHEN 'Tekonivel'       THEN 'Mikä nivel'
    WHEN 'Raskaus'         THEN 'Viikko'
    ELSE NULL
  END,
  tarkenne_tyyppi = CASE nimi
    WHEN 'Allergia'        THEN 'text'
    WHEN 'Verenpaine'      THEN 'select'
    WHEN 'Sydänsairauksia' THEN 'text'
    WHEN 'Tekonivel'       THEN 'text'
    WHEN 'Raskaus'         THEN 'number'
    ELSE NULL
  END;

-- Varmistus: tarkista lopputulos
SELECT nimi, ryhma, tarkenne_label, tarkenne_tyyppi
FROM sairaus_tyypit
ORDER BY ryhma, nimi;
