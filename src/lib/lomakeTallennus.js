// Lomakedata-mappaukset renderöijän tunnisteiden ja DB-saraakkeiden välillä.
//
// `jaaVastaukset` jakaa renderöijän vastaukset tallennustasoittain:
//   - asiakkaat-taulu: perustiedot + suostumukset
//   - asiakastietolomake_versiot-taulu: lomakekohtaiset tekstikentät + kipuluku
//   - lomake_sairaudet-taulu: rastitetut sairaudet
//   - asiakastietolomake_versiot.lisakentat: kentät joille ei ole omaa saraketta
//
// `kokoaVastaukset` on käänteinen — kerää DB-rivit takaisin renderöijän
// vastaukset-muotoon. Käytetään esitäyttöön kun hoitaja avaa olemassa
// olevan asiakkaan lomakkeen muokattavaksi.

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

// Käänteinen: kerää DB-rivit takaisin renderöijän vastaukset-muotoon.
// Käytetään AsiakaslomakeRenderoijalla:n esitäyttöön kun hoitaja avaa
// olemassa olevan asiakkaan — kentät täytetään asiakkaat-rivin, nykyisen
// lomakeversion, sairauksien ja lisakentat-jsonb:n tiedoilla.
export const kokoaVastaukset = (asiakas, versio, sairausIdit = []) => {
  const vastaukset = {}

  // Etu- ja sukunimi nimestä — viimeinen sana sukunimi, muu etunimi.
  if (asiakas?.nimi) {
    const osat = asiakas.nimi.trim().split(/\s+/).filter(Boolean)
    if (osat.length >= 2) {
      vastaukset.etunimi  = osat.slice(0, -1).join(' ')
      vastaukset.sukunimi = osat[osat.length - 1]
    } else if (osat.length === 1) {
      vastaukset.etunimi = osat[0]
    }
  }

  // Asiakas-sarakkeet → tunnisteet (käänteinen ASIAKAS_SARAKKEET-mappaus)
  for (const [tunniste, sarake] of Object.entries(ASIAKAS_SARAKKEET)) {
    const arvo = asiakas?.[sarake]
    if (arvo !== null && arvo !== undefined && arvo !== '') {
      vastaukset[tunniste] = arvo
    }
  }

  // Suostumukset → boolean-tunnisteet (näytetään checkboxina vain jos true)
  for (const [tunniste, sarake] of Object.entries(SUOSTUMUS_SARAKKEET)) {
    if (asiakas?.[sarake] === true) {
      vastaukset[tunniste] = true
    }
  }

  // Lomakeversion sarakkeet → tunnisteet (käänteinen LOMAKE_SARAKKEET-mappaus)
  for (const [tunniste, sarake] of Object.entries(LOMAKE_SARAKKEET)) {
    const arvo = versio?.[sarake]
    if (arvo !== null && arvo !== undefined && arvo !== '') {
      vastaukset[tunniste] = arvo
    }
  }

  // Sairaudet — id-taulukko CheckboxLista-renderöijälle
  if (Array.isArray(sairausIdit) && sairausIdit.length > 0) {
    vastaukset[SAIRAUDET_TUNNISTE] = [...sairausIdit]
  }

  // Lisäkentät — jsonb-objektin jokainen avain on sellainen tunniste joka
  // ei mappaudu mihinkään yllä olevista kategorioista (esim. allekirjoitus,
  // hoitajan luomat omat kentät).
  if (versio?.lisakentat && typeof versio.lisakentat === 'object') {
    for (const [tunniste, arvo] of Object.entries(versio.lisakentat)) {
      if (arvo !== null && arvo !== undefined && arvo !== '') {
        vastaukset[tunniste] = arvo
      }
    }
  }

  return vastaukset
}
