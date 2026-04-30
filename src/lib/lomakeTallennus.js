// Jakaa renderöijän vastaukset tallennustasoittain:
// - asiakkaat-taulu: perustiedot + suostumukset
// - asiakastietolomake_versiot-taulu: lomakekohtaiset tekstikentät + kipuluku
// - lomake_sairaudet-taulu: rastitetut sairaudet
// - asiakastietolomake_versiot.lisakentat: kentät joille ei ole omaa saraketta

// Mappaus pohjan kentta_id_tunniste → asiakkaat-taulun sarake
const ASIAKAS_SARAKKEET = {
  sahkoposti:   'sahkoposti',
  puhelin:      'puhelin',
  syntymaaika:  'syntymaaika',
  katuosoite:   'lahiosoite',
  postinumero:  'postinumero',
  kaupunki:     'postitoimipaikka',
  ammatti:      'ammatti',
  pituus:       'pituus',
  paino:        'paino',
}

// Mappaus pohjan kentta_id_tunniste → asiakastietolomake_versiot-taulun sarake
const LOMAKE_SARAKKEET = {
  hoitoon_tulon_kuvaus: 'hoitoon_syy',
  kipuluku:             'kipu_taso',
  laakkeet:             'laakitys',
  diagnoosit:           'diagnosoidut_sairaudet',
  vammat_huomiot:       'vammat_huomiot',
  harrastukset:         'harrastukset',
}

// Suostumuskentät → asiakkaat-taulun boolean-sarakkeet
const SUOSTUMUS_SARAKKEET = {
  gdpr_hyvaksytty:   'suostumus_tietojen_sailytys',
  lupa_luovutukseen: 'suostumus_tietojen_luovutus',
}

const SAIRAUDET_TUNNISTE = 'sairaudet'

// Tunnisteet jotka käsitellään erikseen jakofunktiossa eivätkä mene lisakentat:iin
const ERIKOISKASITTELY = new Set([
  'etunimi',
  'sukunimi',
  ...Object.keys(ASIAKAS_SARAKKEET),
  ...Object.keys(LOMAKE_SARAKKEET),
  ...Object.keys(SUOSTUMUS_SARAKKEET),
  SAIRAUDET_TUNNISTE,
])

export const jaaVastaukset = (vastaukset) => {
  const asiakas    = {}
  const lomake     = {}
  const lisakentat = {}
  let sairaudet    = []

  for (const [tunniste, arvo] of Object.entries(vastaukset ?? {})) {
    if (arvo === undefined) continue

    if (tunniste === 'etunimi' || tunniste === 'sukunimi') {
      asiakas[tunniste] = arvo
      continue
    }

    if (ASIAKAS_SARAKKEET[tunniste]) {
      asiakas[ASIAKAS_SARAKKEET[tunniste]] = arvo
      continue
    }

    if (SUOSTUMUS_SARAKKEET[tunniste]) {
      asiakas[SUOSTUMUS_SARAKKEET[tunniste]] = arvo === true
      continue
    }

    if (LOMAKE_SARAKKEET[tunniste]) {
      lomake[LOMAKE_SARAKKEET[tunniste]] = arvo
      continue
    }

    if (tunniste === SAIRAUDET_TUNNISTE) {
      sairaudet = Array.isArray(arvo) ? arvo : []
      continue
    }

    if (!ERIKOISKASITTELY.has(tunniste)) {
      lisakentat[tunniste] = arvo
    }
  }

  // Yhdistä etunimi + sukunimi → nimi-sarakkeeksi
  const etunimi   = asiakas.etunimi ?? ''
  const sukunimi  = asiakas.sukunimi ?? ''
  const yhdistetty = `${etunimi} ${sukunimi}`.trim()
  if (yhdistetty) asiakas.nimi = yhdistetty
  delete asiakas.etunimi
  delete asiakas.sukunimi

  return { asiakas, lomake, sairaudet, lisakentat }
}
