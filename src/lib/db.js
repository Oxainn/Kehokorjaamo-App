// Kehokorjaamo-App — tietokantakerros (Supabase JS-client)
//
// Lomake-terminologia:
//   A-lomake = asiakastietolomake_versiot (asiakkaan täyttämä esitietolomake)
//             Yksi voimassa oleva versio per asiakas (voimassa_asti IS NULL),
//             historia voimassa_asti-aikaleimalla.
//   B-lomake = hoitokaynnit (hoitajan täyttämä havaintolomake)
//             Yksi rivi per käynti. Tilat: 'odottaa_kayntia' (tyhjä, asiakas
//             vahvistettu mutta käynti ei vielä pidetty), 'luonnos' (käynnissä,
//             "+ Uusi käynti" avasi sen), 'valmis' (hoitokirjaus tallennettu).
//
// "+ Uusi käynti" -toiminto: sulkee A-lomakkeen aktiivisen version, kopioi
// sen sisällön uuteen avoimeen versioon (jatkohoitoa varten), ja päivittää
// asiakkaan tyhjää B-lomaketta luonnos-tilaan. Jos tyhjää B-lomaketta ei
// ole (toinen tai myöhempi käynti), uusi B-lomake luodaan.

import { supabase } from './supabase'
import { jaaVastaukset } from './lomakeTallennus'

export const tallennaAsiakas = async (data) => {
  const { data: { user } } = await supabase.auth.getUser()

  const rivi = {
    hoitaja_id:       user.id,
    nimi:             data.nimi,
    syntymaaika:      data.syntymaaika || null,
    sahkoposti:       data.sahkoposti,
    puhelin:          data.puhelin,
    lahiosoite:       data.lahiosoite,
    postinumero:      data.postinumero,
    postitoimipaikka: data.postitoimipaikka,
    ammatti:          data.ammatti,
    pituus:           data.pituus || null,
    paino:            data.paino || null,
  }
  if (data.id) rivi.id = data.id

  const { data: asiakas, error } = await supabase
    .from('asiakkaat')
    .upsert(rivi)
    .select()
    .single()

  if (error) {
    console.error('Tallennus epäonnistui:', error)
    return null
  }
  return asiakas
}

export const haeAsiakkaat = async () => {
  const { data, error } = await supabase
    .from('asiakkaat')
    .select('*')
    .order('luotu', { ascending: false })

  if (error) {
    console.error('Haku epäonnistui:', error)
    return []
  }
  return data
}

// Hakee yksittäisen asiakkaan kontraindikaatio-sairaudet. Palauttaa pelkän
// nimi-taulukon. Tyhjä jos ei kontraindikaatioita.
// Käytetään asiakaskortin yläosan punaisessa varoituslaatikossa (Pala B2).
export const haeAsiakkaanKontraindikaatiot = async (asiakasId) => {
  if (!asiakasId) return []
  const map = await haeKontraindikaatiotAsiakkaille([asiakasId])
  return map.get(asiakasId) ?? []
}

// Hakee mitkä asiakkaat ovat rastittaneet vähintään yhden kontraindikaatio-
// sairauden voimassa olevassa lomakkeessaan. Käytetään Asiakasrekisterin
// kortin oranssin varoitusreunan näyttämiseen — hoitajan pitää nähdä yhdellä
// silmäyksellä että hoitoa kannattaa harkita.
//
// Palauttaa Map<asiakas_id, sairauksien_nimet[]> jossa avainjoukon
// pituus = niiden asiakkaiden lukumäärä, joilla on kontraindikaatioita.
export const haeKontraindikaatiotAsiakkaille = async (asiakasIdt) => {
  if (!Array.isArray(asiakasIdt) || asiakasIdt.length === 0) return new Map()

  // Vaihe 1: hae kunkin asiakkaan voimassa oleva lomakeversion id
  const { data: versiot, error: versioVirhe } = await supabase
    .from('asiakastietolomake_versiot')
    .select('id, asiakas_id')
    .in('asiakas_id', asiakasIdt)
    .is('voimassa_asti', null)

  if (versioVirhe || !versiot || versiot.length === 0) return new Map()

  // Vaihe 2: hae sairaudet näille versioille joiden sairaus_tyyppi.kontraindikaatio = true
  const versioIdMap = new Map(versiot.map((v) => [v.id, v.asiakas_id]))
  const { data: sairaudet, error: sairausVirhe } = await supabase
    .from('lomake_sairaudet')
    .select('lomake_versio_id, sairaus_tyyppi:sairaus_tyypit!inner(nimi, kontraindikaatio)')
    .in('lomake_versio_id', [...versioIdMap.keys()])
    .eq('on_voimassa', true)
    .eq('sairaus_tyypit.kontraindikaatio', true)

  if (sairausVirhe || !sairaudet) return new Map()

  const tulos = new Map()
  for (const s of sairaudet) {
    const asiakasId = versioIdMap.get(s.lomake_versio_id)
    if (!asiakasId) continue
    const nimi = s.sairaus_tyyppi?.nimi
    if (!nimi) continue
    if (!tulos.has(asiakasId)) tulos.set(asiakasId, [])
    tulos.get(asiakasId).push(nimi)
  }
  return tulos
}

// Hakee asiakkaan A-lomakkeen kehonkartta-merkinnät voimassa olevasta
// versiosta. Käytetään Pala B6.6:n vertailunäkymässä — hoitaja näkee
// minkä alueen asiakas itse on merkinnyt oireilevaksi.
//
// Palauttaa { merkinnat, vedot, hahmo } -objektin tai null jos asiakkaalla
// ei ole kehonkarttaa lomakkeessaan. merkinnat-rakenne on { vyohyke_id:
// oiretyyppi[] }.
export const haeAsiakkaanKehonkartta = async (asiakasId) => {
  if (!asiakasId) return null
  const { data, error } = await supabase
    .from('asiakastietolomake_versiot')
    .select('lisakentat')
    .eq('asiakas_id', asiakasId)
    .is('voimassa_asti', null)
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('Asiakkaan kehonkartan haku epäonnistui:', error)
    return null
  }
  return data?.lisakentat?.kehonkartta_piirros ?? null
}

// Hakee asiakkaan voimassa olevan A-lomakkeen "hoitoon tulon syy" -tekstin.
// Käytetään Pala B8:n AI-analyysin promptin pohjana (asiakkaan oma kuvaus).
export const haeAsiakkaanOireet = async (asiakasId) => {
  if (!asiakasId) return null
  const { data, error } = await supabase
    .from('asiakastietolomake_versiot')
    .select('hoitoon_syy')
    .eq('asiakas_id', asiakasId)
    .is('voimassa_asti', null)
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('Asiakkaan oireiden haku epäonnistui:', error)
    return null
  }
  return data?.hoitoon_syy ?? null
}

// Hakee asiakkaan menneiden hoitokäyntien päivämäärät + otsikot.
// Palauttaa kaikki suljetut lomakeversiot (voimassa_asti IS NOT NULL)
// uusimmasta vanhimpaan. Jokainen rivi vastaa yhtä mennyttä hoitokäyntiä;
// aktiivinen avoin versio jätetään pois.
//
// rajoitus: jos annettu (esim. 4), palautetaan korkeintaan N uusinta.
// Käytetään Asiakasrekisterin pillerinäkymässä jossa näytetään 4 uusinta.
// Käyntihistoria-listalla rajoitus jätetään null:ksi → kaikki käynnit.
//
// Pala B6.5: jokainen rivi sisältää kayntinumero-kentän — N/M-laskenta
// koko historian järjestyksessä (vanhin = 1).
export const haeKayntienPaivamaarat = async (asiakasId, rajoitus = null) => {
  if (!asiakasId) return []
  // Hae KAIKKI suljetut versiot ensin laskeaksemme käyntinumerot oikein
  // (vanhin = käynti 1). Sitten rajoitettu joukko palautetaan.
  const { data: kaikki, error } = await supabase
    .from('asiakastietolomake_versiot')
    .select('id, voimassa_alkaen, otsikko')
    .eq('asiakas_id', asiakasId)
    .not('voimassa_asti', 'is', null)
    .order('voimassa_alkaen', { ascending: true })
  if (error) {
    console.error('Käyntien päivämäärien haku epäonnistui:', error)
    return []
  }
  const kaikkiNumeroidut = (kaikki ?? []).map((r, i) => ({ ...r, kayntinumero: i + 1 }))
  // Käännä uusimmasta vanhimpaan + sovella rajoitusta
  const uusimmat = [...kaikkiNumeroidut].reverse()
  return typeof rajoitus === 'number' && rajoitus > 0
    ? uusimmat.slice(0, rajoitus)
    : uusimmat
}

// Hakee yksittäisen lomakeversion täydet tiedot + sairaudet — käytetään
// käyntihistorian read-only-modaalissa jossa näytetään yksi vanhentunut
// versio sellaisena kuin se oli sulkemishetkellä.
export const haeLomakeversio = async (lomakeVersioId) => {
  if (!lomakeVersioId) return { versio: null, sairaudet: [] }

  const { data: versio, error: versioVirhe } = await supabase
    .from('asiakastietolomake_versiot')
    .select('id, otsikko, hoitoon_syy, kipu_taso, laakitys, diagnosoidut_sairaudet, vammat_huomiot, harrastukset, lisakentat, muokkaaja_rooli, voimassa_alkaen, voimassa_asti, luotu')
    .eq('id', lomakeVersioId)
    .maybeSingle()

  if (versioVirhe || !versio) {
    console.error('Lomakeversion haku epäonnistui:', versioVirhe)
    return { versio: null, sairaudet: [] }
  }

  const { data: sairaudet } = await supabase
    .from('lomake_sairaudet')
    .select('sairaus_tyyppi:sairaus_tyypit (id, nimi, kontraindikaatio)')
    .eq('lomake_versio_id', lomakeVersioId)
    .eq('on_voimassa', true)

  return {
    versio,
    sairaudet: (sairaudet ?? []).map((s) => s.sairaus_tyyppi).filter(Boolean),
  }
}

// Hakee asiakkaan viimeisimmän lomakeversion + sairaudet — käytetään
// "Uuden asiakkaan tarkistus" -näkymässä jossa hoitaja näkee asiakkaan
// julkisen lomakkeen kautta täyttämät tiedot ennen vahvistusta.
// Palauttaa { versio, sairaudet } tai { versio: null, sairaudet: [] }.
export const haeAsiakkaanViimeisinLomake = async (asiakasId) => {
  if (!asiakasId) return { versio: null, sairaudet: [] }

  const { data: versio } = await supabase
    .from('asiakastietolomake_versiot')
    .select('id, otsikko, hoitoon_syy, kipu_taso, laakitys, diagnosoidut_sairaudet, vammat_huomiot, harrastukset, lisakentat, muokkaaja_rooli, luotu')
    .eq('asiakas_id', asiakasId)
    .is('voimassa_asti', null)
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!versio) return { versio: null, sairaudet: [] }

  const { data: sairaudet } = await supabase
    .from('lomake_sairaudet')
    .select(`
      sairaus_tyyppi:sairaus_tyypit (id, nimi, kontraindikaatio)
    `)
    .eq('lomake_versio_id', versio.id)
    .eq('on_voimassa', true)

  const sairausObjektit = (sairaudet ?? []).map((s) => s.sairaus_tyyppi).filter(Boolean)
  return {
    versio,
    sairaudet:  sairausObjektit,
    sairausIdit: sairausObjektit.map((s) => s.id),
  }
}

// Aloittaa uuden hoitokäynnin asiakkaalle:
//   1. Sulkee nykyisen avoimen lomakeversion (voimassa_asti = now()) —
//      lukittuu käyntihistoriaan eikä sitä voi enää muokata
//   2. Luo uuden version kopioimalla suljetun version kaikki kentät
//   3. Kopioi suljetun version lomake_sairaudet-rivit uuteen versioon
//
// Lopputulos: asiakkaalla on edelleen yksi avoin (muokattavissa oleva)
// versio jonka sisältö vastaa edellistä, mutta historiaan jää lukittu
// snapshot edellisen käynnin tilanteesta.
export const aloitaUusiKaynti = async (asiakasId) => {
  if (!asiakasId) return { virhe: 'Asiakas-id puuttuu' }
  const { data: { user }, error: userVirhe } = await supabase.auth.getUser()
  if (userVirhe || !user) return { virhe: 'Kirjautuminen vaaditaan' }

  // 1. Hae nykyinen avoin versio kaikkine kenttineen
  const { data: avoin, error: hakuVirhe } = await supabase
    .from('asiakastietolomake_versiot')
    .select('id, hoitoon_syy, kipu_taso, laakitys, diagnosoidut_sairaudet, vammat_huomiot, harrastukset, lisakentat')
    .eq('asiakas_id', asiakasId)
    .is('voimassa_asti', null)
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (hakuVirhe) {
    console.error('Avoimen version haku epäonnistui:', hakuVirhe)
    return { virhe: hakuVirhe.message }
  }

  // Jos avointa versiota ei ole, luodaan vain tyhjä uusi (reunatapaus —
  // pitäisi olla harvinainen koska julkinen lomake luo aina version)
  if (!avoin) {
    const { data: uusi, error: luontiVirhe } = await supabase
      .from('asiakastietolomake_versiot')
      .insert({
        asiakas_id:      asiakasId,
        muokkaaja_id:    user.id,
        muokkaaja_rooli: 'hoitaja',
      })
      .select('id')
      .single()
    if (luontiVirhe) {
      console.error('Tyhjän version luonti epäonnistui:', luontiVirhe)
      return { virhe: luontiVirhe.message }
    }
    return { lomakeVersioId: uusi.id, virhe: null }
  }

  // 2. Sulje nykyinen versio
  const nyt = new Date().toISOString()
  const { error: sulkuVirhe } = await supabase
    .from('asiakastietolomake_versiot')
    .update({ voimassa_asti: nyt })
    .eq('id', avoin.id)
  if (sulkuVirhe) {
    console.error('Vanhan version sulku epäonnistui:', sulkuVirhe)
    return { virhe: sulkuVirhe.message }
  }

  // 3. Hae sairaudet vanhasta versiosta — säilytetään käyntihistoriassa
  //    ja kopioidaan uuteen versioon
  const { data: vanhatSairaudet, error: sairaudetVirhe } = await supabase
    .from('lomake_sairaudet')
    .select('sairaus_tyyppi_id, on_voimassa, tarkenne')
    .eq('lomake_versio_id', avoin.id)
  if (sairaudetVirhe) {
    console.warn('Sairauksien haku vanhasta versiosta epäonnistui:', sairaudetVirhe)
  }

  // 4. Luo uusi versio kopioimalla sisältö.
  // Varmuus: jos lisakentat sisältää suostumustunnisteita (gdpr_hyvaksytty,
  // lupa_luovutukseen) — esim. vanhan datan vuoksi — niitä ei kopioida.
  // Suostumukset säilyvät asiakkaat-rivin boolean-sarakkeissa, ei lomake-
  // versiossa.
  let kopioitavatLisat = avoin.lisakentat ?? null
  if (kopioitavatLisat && typeof kopioitavatLisat === 'object') {
    const { gdpr_hyvaksytty: _g, lupa_luovutukseen: _l, ...puhtaat } = kopioitavatLisat
    kopioitavatLisat = puhtaat
  }

  const { data: uusi, error: luontiVirhe } = await supabase
    .from('asiakastietolomake_versiot')
    .insert({
      asiakas_id:             asiakasId,
      hoitoon_syy:            avoin.hoitoon_syy,
      kipu_taso:              avoin.kipu_taso,
      laakitys:               avoin.laakitys,
      diagnosoidut_sairaudet: avoin.diagnosoidut_sairaudet,
      vammat_huomiot:         avoin.vammat_huomiot,
      harrastukset:           avoin.harrastukset,
      lisakentat:             kopioitavatLisat,
      muokkaaja_id:           user.id,
      muokkaaja_rooli:        'hoitaja',
    })
    .select('id')
    .single()
  if (luontiVirhe) {
    console.error('Uuden version luonti epäonnistui:', luontiVirhe)
    return { virhe: luontiVirhe.message }
  }

  // 5. Kopioi sairaudet uuteen versioon
  if (vanhatSairaudet && vanhatSairaudet.length > 0) {
    const rivit = vanhatSairaudet.map((s) => ({
      lomake_versio_id:  uusi.id,
      sairaus_tyyppi_id: s.sairaus_tyyppi_id,
      on_voimassa:       s.on_voimassa,
      tarkenne:          s.tarkenne,
    }))
    const { error: kopiointiVirhe } = await supabase
      .from('lomake_sairaudet')
      .insert(rivit)
    if (kopiointiVirhe) {
      // Versio on luotu mutta sairaudet eivät kopioituneet — palauta varoitus
      // mutta älä kaada toimintoa (käyttäjä voi rastittaa sairaudet uudestaan)
      console.warn('Sairauksien kopiointi epäonnistui:', kopiointiVirhe)
    }
  }

  // 6. Käytä olemassa olevaa tyhjää B-lomaketta jos sellainen on
  // (asiakkaan vahvistuksessa luotu odottaa_kayntia-rivi). Muuten luo uusi.
  // Snapshot-malli: hoitokerta osoittaa siihen A-lomakkeen versioon joka
  // oli voimassa hoidon alkaessa (juuri suljettu), ei uuteen avoimeen.
  const bLomakePaivitys = {
    lomake_versio_id: avoin.id,   // A-lomake (asiakastietolomake_versiot)
    pvm:              nyt,
    tila:             'luonnos',
  }

  const { data: tyhjaBLomake } = await supabase
    .from('hoitokaynnit')
    .select('id')
    .eq('asiakas_id', asiakasId)
    .eq('tila', 'odottaa_kayntia')
    .order('luotu', { ascending: true })
    .limit(1)
    .maybeSingle()

  let bLomakeId = null
  if (tyhjaBLomake) {
    // Päivitä tyhjä B-lomake "luonnos"-tilaan — tämä on asiakkaan ensimmäinen käynti
    const { error: paivitysVirhe } = await supabase
      .from('hoitokaynnit')
      .update(bLomakePaivitys)
      .eq('id', tyhjaBLomake.id)
    if (paivitysVirhe) {
      console.warn('Tyhjän B-lomakkeen päivitys epäonnistui:', paivitysVirhe)
      return {
        lomakeVersioId: uusi.id,
        hoitokayntiId:  null,
        virhe:          null,
        varoitus:       `Uusi käynti aloitettu mutta B-lomakkeen päivitys epäonnistui: ${paivitysVirhe.message}`,
      }
    }
    bLomakeId = tyhjaBLomake.id
  } else {
    // Luo uusi B-lomake — toinen tai myöhempi käynti
    const { data: hoitokaynti, error: hoitokayntiVirhe } = await supabase
      .from('hoitokaynnit')
      .insert({
        asiakas_id: asiakasId,
        hoitaja_id: user.id,
        ...bLomakePaivitys,
      })
      .select('id')
      .single()
    if (hoitokayntiVirhe) {
      console.warn('Hoitokaynnit-rivin luonti epäonnistui:', hoitokayntiVirhe)
      return {
        lomakeVersioId: uusi.id,
        hoitokayntiId:  null,
        virhe:          null,
        varoitus:       `Uusi käynti aloitettu mutta B-lomaketta ei luotu: ${hoitokayntiVirhe.message}`,
      }
    }
    bLomakeId = hoitokaynti.id
  }

  return {
    lomakeVersioId: uusi.id,
    hoitokayntiId:  bLomakeId,
    virhe:          null,
  }
}

// Hoitokäyntien lukumäärä asiakkaalle — käytetään hoitokirjaus-näkymän
// "Käynti X / Y" -laskurissa.
//
// Pala B6.5: laskuri sulkee pois 'odottaa_kayntia'-rivit (tyhjät B-lomakkeet
// jotka odottavat ensimmäistä käyntiä). N = tehdyt käynnit + nykyinen
// luonnos = todellinen käyntinumero kun käyttäjä on hoitokirjauksessa.
export const haeAsiakkaanKayntienMaara = async (asiakasId) => {
  if (!asiakasId) return 0
  const { count, error } = await supabase
    .from('hoitokaynnit')
    .select('*', { count: 'exact', head: true })
    .eq('asiakas_id', asiakasId)
    .neq('tila', 'odottaa_kayntia')
  if (error) {
    console.error('Käyntien laskeminen epäonnistui:', error)
    return 0
  }
  return count ?? 0
}

// Hakee hoitajan aktiivisten palvelujen ensimmäisen hoitosarjan_pituuden.
// Yksinkertaistus: yhden hoitajan tuotteissa oletamme yhden pääpalvelun.
// Pala B6.5 — käytetään käyntinumeron M-osana ("Käynti N/M").
export const haeHoitosarjanPituus = async () => {
  const { data, error } = await supabase
    .from('palvelut')
    .select('hoitosarjan_pituus')
    .eq('aktiivinen', true)
    .not('hoitosarjan_pituus', 'is', null)
    .order('jarjestys', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('Hoitosarjan pituuden haku epäonnistui:', error)
    return null
  }
  return data?.hoitosarjan_pituus ?? null
}

// Tallentaa hoitokirjauksen tiedot. Pala B2:ssa laajennettu kattamaan
// hoitoraportti-osion kentät, Pala B3:ssa 15 linjausmittaria.
//
// VB2 — optimistinen lukko: tiedot.versio (jos annettu) on UI:n lukema
// hetki ennen muokkausta. Jos DB:n versio on suurempi, joku muu (esim
// toinen välilehti) on tallentanut välissä → palauta { ristiriita: true,
// nykyinenVersio }. Jos versio puuttuu (vanha kutsu, tai luonti) → ohita
// tarkistus ja päivitä silti.
export const tallennaHoitokirjaus = async (hoitokayntiId, tiedot) => {
  if (!hoitokayntiId) return { virhe: 'Hoitokaynti-id puuttuu' }
  const muutokset = { paivitetty: new Date().toISOString() }
  const sallitut = [
    // Pala B1
    'otsikko', 'hoidon_kulku', 'hoitajan_kommentit', 'tila',
    // Pala B2
    'kesto_min', 'lahtotilanne', 'muista_ensi_kerralla',
    // Pala B3 — linjausmittarit
    'lantion_kallistus_aste', 'lantion_sivuttainen_aste', 'lantion_kierto_aste',
    'olkapaiden_korkeusero_cm', 'paan_eteen_tyontyminen_cm',
    'q_kulma_vasen_aste', 'q_kulma_oikea_aste', 'skolioosin_kierto_aste',
    'niskan_kaannos_vasen_aste', 'niskan_kaannos_oikea_aste',
    'jalkapituus_ero_cm',
    'navicular_drop_vasen_mm', 'navicular_drop_oikea_mm',
    'akillesjanteen_kulma_vasen_aste', 'akillesjanteen_kulma_oikea_aste',
    // Pala B6.5 — jatkohoitosuunnitelma
    'seuraava_kaynti_pvm',
  ]
  for (const k of sallitut) {
    if (tiedot[k] !== undefined) muutokset[k] = tiedot[k] === '' ? null : tiedot[k]
  }

  // VB2: optimistinen lukko — UPDATE ... WHERE id=X AND versio=Y.
  // Jos rivi ei löydy (versio ei täsmää), saamme 0 päivitettyä riviä.
  const odotettuVersio = typeof tiedot.versio === 'number' ? tiedot.versio : null
  muutokset.versio = (odotettuVersio ?? 0) + 1

  let kysely = supabase
    .from('hoitokaynnit')
    .update(muutokset)
    .eq('id', hoitokayntiId)
  if (odotettuVersio !== null) kysely = kysely.eq('versio', odotettuVersio)

  const { data, error } = await kysely.select('id, versio')
  if (error) {
    console.error('Hoitokirjauksen tallennus epäonnistui:', error)
    return { virhe: error.message }
  }
  if (odotettuVersio !== null && (!data || data.length === 0)) {
    // Versio ei täsmännyt → joku muu on tallentanut välissä
    const { data: nyk } = await supabase
      .from('hoitokaynnit')
      .select('versio')
      .eq('id', hoitokayntiId)
      .maybeSingle()
    return {
      virhe: 'Käynti on muokattu toisessa ikkunassa. Päivitä sivu nähdäksesi uusin tila tai peru muutokset.',
      ristiriita: true,
      nykyinenVersio: nyk?.versio ?? null,
    }
  }
  return { virhe: null, versio: data?.[0]?.versio ?? null }
}

// Tallentaa hoitokäynnin BodyMap-löydökset havainnot-tauluun.
// Pala B2: yksinkertainen delete-then-insert. Yksi havainto-rivi per löydetty
// alue (lantio, polvi, jne.). Tarkka rakenne (kipu, kirjaukset) tallentuu
// lisakentat-jsonbiin koska BodyMap:n KIRJAUSRAKENNE evolvoi nopeammin
// kuin DB:n strukturoitu malli.
export const tallennaHavainnot = async (hoitokayntiId, loydokset) => {
  if (!hoitokayntiId) return { virhe: 'Hoitokaynti-id puuttuu' }

  // 1. Poista vanhat havainnot
  const { error: poistoVirhe } = await supabase
    .from('havainnot')
    .delete()
    .eq('hoitokaynti_id', hoitokayntiId)
  if (poistoVirhe) {
    console.error('Vanhojen havaintojen poisto epäonnistui:', poistoVirhe)
    return { virhe: poistoVirhe.message }
  }

  if (!loydokset || loydokset.length === 0) return { virhe: null }

  // 2. Lisää uudet
  const rivit = loydokset.map((l) => ({
    hoitokaynti_id: hoitokayntiId,
    tyyppi:         'asentomuutos',  // BodyMap on pohjimmiltaan asentomuutosten kirjaus
    voimakkuus:     l.kipu ?? null,
    kuvaus:         l.alueNimi,
    lisakentat:     {
      alueId:     l.alueId,
      tyyppi:     l.tyyppi,
      kirjaukset: l.kirjaukset,
    },
  }))
  const { error: lisaysVirhe } = await supabase.from('havainnot').insert(rivit)
  if (lisaysVirhe) {
    console.error('Havaintojen tallennus epäonnistui:', lisaysVirhe)
    return { virhe: lisaysVirhe.message }
  }
  return { virhe: null }
}

// Hakee hoitokäyntiin liittyvät havainnot — esitäyttöä varten.
export const haeHavainnot = async (hoitokayntiId) => {
  if (!hoitokayntiId) return []
  const { data, error } = await supabase
    .from('havainnot')
    .select('id, voimakkuus, kuvaus, lisakentat')
    .eq('hoitokaynti_id', hoitokayntiId)
  if (error) {
    console.error('Havaintojen haku epäonnistui:', error)
    return []
  }
  return data ?? []
}

// Hakee asiakkaan edellisen valmiin käynnin mittausarvot — käytetään
// Pala B4:n vertailussa (kunkin liukusäätimen alle "edell. -5°" + delta).
// Palauttaa { sarake: arvo | null } -objektin tai null jos ei aiempaa käyntiä.
// Kelpuuttaa myös 'luonnos'-tilan rivit jotta kesken jätetyltä käynniltä
// tehdyt mittaukset näkyvät seuraavassa, jos hoitaja palaa siihen.
export const haeEdellisetMittarit = async (asiakasId, paitsiId = null) => {
  if (!asiakasId) return null
  let query = supabase
    .from('hoitokaynnit')
    .select('lantion_kallistus_aste, lantion_sivuttainen_aste, lantion_kierto_aste, olkapaiden_korkeusero_cm, paan_eteen_tyontyminen_cm, q_kulma_vasen_aste, q_kulma_oikea_aste, skolioosin_kierto_aste, niskan_kaannos_vasen_aste, niskan_kaannos_oikea_aste, jalkapituus_ero_cm, navicular_drop_vasen_mm, navicular_drop_oikea_mm, akillesjanteen_kulma_vasen_aste, akillesjanteen_kulma_oikea_aste, pvm')
    .eq('asiakas_id', asiakasId)
    .neq('tila', 'odottaa_kayntia')
    .not('pvm', 'is', null)
    .order('luotu', { ascending: false })
    .limit(1)
  if (paitsiId) query = query.neq('id', paitsiId)
  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('Edellisten mittarien haku epäonnistui:', error)
    return null
  }
  return data
}

// Hakee asiakkaan edellisen valmiiksi merkityn B-lomakkeen — käytetään
// "Muista ensi kerralla" -nostoon Hoitokirjaus-näkymän yläosassa.
// paitsiId: rajaa pois nykyinen hoitokäynti (jos se on jo tila='valmis'-tilassa).
export const haeEdellinenValmiisKaynti = async (asiakasId, paitsiId = null) => {
  if (!asiakasId) return null
  let query = supabase
    .from('hoitokaynnit')
    .select('id, pvm, otsikko, muista_ensi_kerralla, hoidon_kulku')
    .eq('asiakas_id', asiakasId)
    .eq('tila', 'valmis')
    .not('pvm', 'is', null)
    .order('pvm', { ascending: false })
    .limit(1)
  if (paitsiId) query = query.neq('id', paitsiId)
  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('Edellisen käynnin haku epäonnistui:', error)
    return null
  }
  return data
}

// Hakee yksittäisen hoitokäynnin tiedot — käytetään Hoitokirjaus-näkymässä
// kun hoitaja jatkaa luonnoksen muokkausta (jos hänellä on luonnos).
export const haeHoitokaynti = async (hoitokayntiId) => {
  if (!hoitokayntiId) return null
  const { data, error } = await supabase
    .from('hoitokaynnit')
    .select('*')
    .eq('id', hoitokayntiId)
    .maybeSingle()
  if (error) {
    console.error('Hoitokäynnin haku epäonnistui:', error)
    return null
  }
  return data
}

// ─── Itsehoito-kirjasto (Pala B5) ───────────────────────────────────
// Hoitajan ylläpitämä yleisten harjoitusten kokoelma. Erotettu
// itsehoito_harjoitukset-taulusta (joka on asiakas-spesifinen).

export const haeItsehoitoKirjasto = async ({ arkistoitu = false } = {}) => {
  const { data, error } = await supabase
    .from('itsehoito_kirjasto')
    .select('*')
    .eq('arkistoitu', arkistoitu)
    .order('nimi', { ascending: true })
  if (error) {
    console.error('Itsehoito-kirjaston haku epäonnistui:', error)
    return []
  }
  return data ?? []
}

export const luoItsehoitoHarjoitus = async (tiedot) => {
  if (!tiedot?.nimi?.trim()) return { virhe: 'Nimi puuttuu' }
  const { data: { user }, error: userVirhe } = await supabase.auth.getUser()
  if (userVirhe || !user) return { virhe: 'Kirjautuminen vaaditaan' }

  const rivi = {
    hoitaja_id:   user.id,
    nimi:         tiedot.nimi.trim().slice(0, 80),
    lyhyt_kuvaus: tiedot.lyhyt_kuvaus?.trim() || null,
    pitka_ohje:   tiedot.pitka_ohje?.trim() || null,
    kohdealueet:  Array.isArray(tiedot.kohdealueet) ? tiedot.kohdealueet : [],
    kesto_min:    tiedot.kesto_min ?? null,
    toistot:      tiedot.toistot?.trim() || null,
    frekvenssi:   tiedot.frekvenssi?.trim() || null,
    varoitukset:  tiedot.varoitukset?.trim() || null,
    kuva_url:     tiedot.kuva_url?.trim() || null,
    video_url:    tiedot.video_url?.trim() || null,
  }
  const { data, error } = await supabase
    .from('itsehoito_kirjasto')
    .insert(rivi)
    .select('id')
    .single()
  if (error) {
    console.error('Itsehoito-harjoituksen luonti epäonnistui:', error)
    return { virhe: error.message }
  }
  return { id: data.id, virhe: null }
}

// Hakee hoitokäynnin id:n A-lomakeversion id:n perusteella.
// Käytetään kun käyntipillerin klikkauksesta avattu KayntiNakyma haluaa
// hakea kyseisen käynnin itsehoito-valinnat (Pala B6) PDF:ää varten.
// Snapshot-mallilla yksi hoitokaynti per A-lomakeversio.
export const haeHoitokayntiVersionPerusteella = async (lomakeVersioId) => {
  if (!lomakeVersioId) return null
  const { data, error } = await supabase
    .from('hoitokaynnit')
    .select('id')
    .eq('lomake_versio_id', lomakeVersioId)
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('Hoitokäynnin haku version perusteella epäonnistui:', error)
    return null
  }
  return data?.id ?? null
}

// ─── Käyntikohtaiset itsehoito-valinnat (Pala B6) ──────────────────
// Hoitaja valitsee kirjastosta harjoituksia jokaiselle hoitokerralle.

// Palauttaa käynnin valitut harjoitukset + kirjaston harjoitustiedot
// joinilla. Järjestys: jarjestys-kenttä, sitten luotu.
export const haeKaynninItsehoito = async (hoitokayntiId) => {
  if (!hoitokayntiId) return []
  const { data, error } = await supabase
    .from('itsehoito_kaynnin_valinnat')
    .select('id, jarjestys, toistot_muokattu, frekvenssi_muokattu, lisahuomautus, kirjasto_harjoitus_id, harjoitus:itsehoito_kirjasto!inner(id, nimi, lyhyt_kuvaus, pitka_ohje, kohdealueet, kesto_min, toistot, frekvenssi, varoitukset, kuva_url, video_url)')
    .eq('hoitokaynti_id', hoitokayntiId)
    .order('jarjestys', { ascending: true })
    .order('luotu', { ascending: true })
  if (error) {
    console.error('Käynnin itsehoito-valintojen haku epäonnistui:', error)
    return []
  }
  return data ?? []
}

// Tallentaa valitut harjoitukset käynnille — delete-then-insert.
// valinnat: [{ kirjasto_harjoitus_id, jarjestys?, toistot_muokattu?,
//              frekvenssi_muokattu?, lisahuomautus? }]
export const tallennaKaynninItsehoito = async (hoitokayntiId, valinnat) => {
  if (!hoitokayntiId) return { virhe: 'Hoitokaynti-id puuttuu' }

  const { error: poistoVirhe } = await supabase
    .from('itsehoito_kaynnin_valinnat')
    .delete()
    .eq('hoitokaynti_id', hoitokayntiId)
  if (poistoVirhe) {
    console.error('Vanhojen valintojen poisto epäonnistui:', poistoVirhe)
    return { virhe: poistoVirhe.message }
  }

  if (!Array.isArray(valinnat) || valinnat.length === 0) return { virhe: null }

  const rivit = valinnat.map((v, i) => ({
    hoitokaynti_id:        hoitokayntiId,
    kirjasto_harjoitus_id: v.kirjasto_harjoitus_id,
    jarjestys:             typeof v.jarjestys === 'number' ? v.jarjestys : i,
    toistot_muokattu:      (v.toistot_muokattu ?? '').trim() || null,
    frekvenssi_muokattu:   (v.frekvenssi_muokattu ?? '').trim() || null,
    lisahuomautus:         (v.lisahuomautus ?? '').trim() || null,
  }))
  const { error: lisaysVirhe } = await supabase
    .from('itsehoito_kaynnin_valinnat')
    .insert(rivit)
  if (lisaysVirhe) {
    console.error('Itsehoito-valintojen lisäys epäonnistui:', lisaysVirhe)
    return { virhe: lisaysVirhe.message }
  }
  return { virhe: null }
}

// ─── Pala B8 — AI-analyysi löydöksistä ─────────────────────────────
// Kutsuu Edge Functionia ai-analyysi-loydoksista joka kysyy Anthropic
// Claude API:lta hoitajan löydösten analyysin. Jätä tallentamatta —
// tallennus tapahtuu erillisellä funktiolla (tallennaAIAnalyysi) kun
// hoitaja päättää säilyttää sen käynnillä.
export const kutsuAIAnalyysi = async ({
  findings,
  mittarit = null,
  edellisetMittarit = null,
  asiakkaanKehonkartta = null,
  asiakkaanOireet = null,
  hoitokayntiId = null,
}) => {
  if (!Array.isArray(findings) || findings.length === 0) {
    return { virhe: 'Tee ensin havaintoja BodyMap:ssa.' }
  }
  const { data, error } = await supabase.functions.invoke('ai-analyysi-loydoksista', {
    body: {
      findings,
      mittarit,
      edellisetMittarit,
      asiakkaanKehonkartta,
      asiakkaanOireet,
      hoitokayntiId,
    },
  })
  if (error) {
    console.error('AI-analyysin kutsu epäonnistui:', error)
    return { virhe: error.message ?? 'AI-kutsu epäonnistui' }
  }
  if (data?.virhe) return { virhe: data.virhe, rate_limit: data.rate_limit ?? null }
  return {
    analyysi:   data.analyysi,
    prompti:    data.prompti,
    malli:      data.malli,
    rate_limit: data.rate_limit ?? null,
    virhe:      null,
  }
}

// VB6 — hae hoitajan AI-kutsujen määrä viimeiseltä tunnilta + päivältä.
// Käytetään UI:ssa kvoot-laskurin näyttämiseen ennen pyyntöä.
// Palauttaa { tunnilla, paivassa } tai null jos epäonnistuu.
export const haeAIKutsuKvoot = async () => {
  const tunti = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const paiva = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [tunnillaRes, paivassaRes] = await Promise.all([
    supabase.from('ai_kutsu_loki').select('id', { count: 'exact', head: true }).gte('luotu', tunti),
    supabase.from('ai_kutsu_loki').select('id', { count: 'exact', head: true }).gte('luotu', paiva),
  ])
  if (tunnillaRes.error || paivassaRes.error) return null
  return {
    tunnilla:       tunnillaRes.count ?? 0,
    paivassa:       paivassaRes.count ?? 0,
    tunnin_kiintio: 30,
    paivan_kiintio: 200,
  }
}

// Hakee käynnille tallennetun AI-analyysin (tyyppi='loydosanalyysi').
// Palauttaa { id, vastaus, prompti, malli, luotu } tai null.
export const haeAIAnalyysi = async (hoitokayntiId) => {
  if (!hoitokayntiId) return null
  const { data, error } = await supabase
    .from('ai_ehdotukset')
    .select('id, ehdotus_alkuperainen, ehdotus_muokattu, ai_malli, ai_konteksti, luotu')
    .eq('hoitokaynti_id', hoitokayntiId)
    .eq('tyyppi', 'loydosanalyysi')
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('AI-analyysin haku epäonnistui:', error)
    return null
  }
  if (!data) return null
  return {
    id:      data.id,
    vastaus: data.ehdotus_muokattu ?? data.ehdotus_alkuperainen,
    prompti: data.ai_konteksti?.prompti ?? null,
    malli:   data.ai_malli,
    luotu:   data.luotu,
  }
}

// Tallentaa AI-analyysin käynnille. Yksi rivi per (käynti, tyyppi)
// migraation 20260501_ai_ehdotukset_unique.sql tuoman uniikin rajoitteen
// ansiosta — käytetään upsertia jotta delete+insert-racea ei tarvita.
export const tallennaAIAnalyysi = async (hoitokayntiId, { vastaus, prompti, malli }) => {
  if (!hoitokayntiId) return { virhe: 'Hoitokaynti-id puuttuu' }
  if (!vastaus)      return { virhe: 'Vastaus puuttuu' }

  const { error } = await supabase
    .from('ai_ehdotukset')
    .upsert({
      hoitokaynti_id:       hoitokayntiId,
      tyyppi:               'loydosanalyysi',
      ehdotus_alkuperainen: vastaus,
      ai_malli:             malli ?? null,
      ai_konteksti:         prompti ? { prompti } : null,
      // luotu päivittyy myös uusilla pyynneillä → "viimeisin" on aina
      // ajantasainen.
      luotu:                new Date().toISOString(),
    }, { onConflict: 'hoitokaynti_id,tyyppi' })
  if (error) {
    console.error('AI-analyysin tallennus epäonnistui:', error)
    return { virhe: error.message }
  }
  return { virhe: null }
}

export const paivitaItsehoitoHarjoitus = async (id, tiedot) => {
  if (!id) return { virhe: 'Id puuttuu' }
  const muutokset = { paivitetty: new Date().toISOString() }
  const sallitut = ['nimi', 'lyhyt_kuvaus', 'pitka_ohje', 'kohdealueet',
                    'kesto_min', 'toistot', 'frekvenssi', 'varoitukset',
                    'kuva_url', 'video_url', 'arkistoitu']
  for (const k of sallitut) {
    if (tiedot[k] !== undefined) {
      if (k === 'kohdealueet') {
        muutokset[k] = Array.isArray(tiedot[k]) ? tiedot[k] : []
      } else if (typeof tiedot[k] === 'string') {
        muutokset[k] = tiedot[k].trim() || null
      } else {
        muutokset[k] = tiedot[k] === '' ? null : tiedot[k]
      }
    }
  }
  if (muutokset.nimi) muutokset.nimi = muutokset.nimi.slice(0, 80)
  const { error } = await supabase
    .from('itsehoito_kirjasto')
    .update(muutokset)
    .eq('id', id)
  if (error) {
    console.error('Itsehoito-harjoituksen päivitys epäonnistui:', error)
    return { virhe: error.message }
  }
  return { virhe: null }
}

// Päivittää asiakkaan perustiedot — käytetään pikamuokkaus-modaalissa
// jossa hoitaja päivittää nopeasti yhteystiedot (puhelin, sähköposti,
// osoite) ilman että avaa koko lomakkeen. EI muokkaa lomakeversioita
// eikä sairauksia.
export const paivitaAsiakkaanPerustiedot = async (asiakasId, tiedot) => {
  if (!asiakasId) return { virhe: 'Asiakas-id puuttuu' }
  const muutokset = { paivitetty: new Date().toISOString() }
  // Vain sallitut kentät — älä päästä mielivaltaisia avaimia DB:hen
  const sallitut = ['nimi', 'sahkoposti', 'puhelin', 'lahiosoite', 'postinumero', 'postitoimipaikka']
  for (const k of sallitut) {
    if (tiedot[k] !== undefined) muutokset[k] = tiedot[k] === '' ? null : tiedot[k]
  }
  const { error } = await supabase
    .from('asiakkaat')
    .update(muutokset)
    .eq('id', asiakasId)
  if (error) {
    console.error('Asiakkaan perustietojen päivitys epäonnistui:', error)
    return { virhe: error.message }
  }
  return { virhe: null }
}

// Pehmeä poisto: piilottaa asiakkaan normaalista listasta mutta säilyttää
// kaikki tiedot DB:ssä (lakisääteinen 6 v säilytysaika hoitoasiakirjoille).
// Asiakas näkyy "Arkisto"-näkymässä josta voi palauttaa.
export const arkistoiAsiakas = async (asiakasId) => {
  const { error } = await supabase
    .from('asiakkaat')
    .update({ arkistoitu: true, paivitetty: new Date().toISOString() })
    .eq('id', asiakasId)
  if (error) {
    console.error('Asiakkaan arkistointi epäonnistui:', error)
    return { virhe: error.message }
  }
  return { virhe: null }
}

// Palauttaa arkistoidun asiakkaan takaisin aktiiviseen rekisteriin.
export const palautaAsiakas = async (asiakasId) => {
  const { error } = await supabase
    .from('asiakkaat')
    .update({ arkistoitu: false, paivitetty: new Date().toISOString() })
    .eq('id', asiakasId)
  if (error) {
    console.error('Asiakkaan palautus epäonnistui:', error)
    return { virhe: error.message }
  }
  return { virhe: null }
}

// Lasketaan arkistoitujen asiakkaiden lukumäärä — käytetään Asiakasrekisterin
// "🗄 Arkisto (X)" -linkin badgessa.
export const haeArkistoidunMaara = async (hoitajaId) => {
  if (!hoitajaId) return 0
  const { count, error } = await supabase
    .from('asiakkaat')
    .select('*', { count: 'exact', head: true })
    .eq('hoitaja_id', hoitajaId)
    .eq('arkistoitu', true)
  if (error) {
    console.error('Arkistoitujen asiakkaiden määrän haku epäonnistui:', error)
    return 0
  }
  return count ?? 0
}

// Vahvistaa julkisen lomakkeen kautta tulleen asiakkaan — siirtää hänet
// Asiakasrekisterin "Uudet asiakkaat" -osiosta normaaliin asiakaslistaan.
//
// VB5: ei luoda enää tyhjää B-lomaketta vahvistuksen yhteydessä.
// Aiemmin luotiin 'odottaa_kayntia'-rivi joka jäi tyhjäksi jos asiakas
// ei tullutkaan käyntiin → roska DB:ssä. Nyt hoitokaynti-rivi luodaan
// vasta kun "+ Uusi käynti" klikataan (aloitaUusiKaynti).
//
// aloitaUusiKaynti tukee edelleen vanhoja 'odottaa_kayntia'-rivejä jos
// niitä on jossain (uudelleen-käyttölogiikka), mutta uusia ei enää tehdä.
export const vahvistaAsiakas = async (asiakasId) => {
  const { error } = await supabase
    .from('asiakkaat')
    .update({ vahvistettu: true, paivitetty: new Date().toISOString() })
    .eq('id', asiakasId)
  if (error) {
    console.error('Asiakkaan vahvistus epäonnistui:', error)
    return { virhe: error.message }
  }
  return { virhe: null }
}

// Lasketaan vahvistamattomien asiakkaiden määrä — käytetään ylävalikon badgessa.
export const haeUusienAsiakkaidenMaara = async (hoitajaId) => {
  if (!hoitajaId) return 0
  const { count, error } = await supabase
    .from('asiakkaat')
    .select('*', { count: 'exact', head: true })
    .eq('hoitaja_id', hoitajaId)
    .eq('vahvistettu', false)

  if (error) {
    console.error('Uusien asiakkaiden lukumäärän haku epäonnistui:', error)
    return 0
  }
  return count ?? 0
}

export const tallennaKaynti = async (
  asiakasId, havainnot, loyodokset,
  hoitosuunnitelma, kuvaAnalyysit,
  pvm
) => {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('hoitokaynit')
    .insert({
      asiakas_id:      asiakasId,
      hoitaja_id:      user.id,
      havainnot,
      loyodokset,
      hoitosuunnitelma,
      kuva_analyysit:  kuvaAnalyysit,
      pvm:             pvm ? new Date(pvm).toISOString() : new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Käynti epäonnistui:', error)
    return null
  }
  return data
}

export const haeKaynit = async (asiakasId) => {
  const { data, error } = await supabase
    .from('hoitokaynit')
    .select('*')
    .eq('asiakas_id', asiakasId)
    .order('pvm', { ascending: false })

  if (error) {
    console.error('Käyntien haku epäonnistui:', error)
    return []
  }
  return data
}

export const haeAsiakkaatKaynneilla = async () => {
  const { data, error } = await supabase
    .from('asiakkaat')
    .select(`
      *,
      hoitokaynit (
        id,
        pvm
      )
    `)
    .order('luotu', { ascending: false })

  if (error) {
    console.error('Haku epäonnistui:', error)
    return []
  }

  return data.map(a => ({
    ...a,
    viimeisinKaynti: a.hoitokaynit
      ?.sort((x, y) => new Date(y.pvm) - new Date(x.pvm))[0]?.pvm ?? null,
    kaynteja: a.hoitokaynit?.length ?? 0,
  }))
}

export const haeKaynnitViikolle = async () => {
  const viikkoAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('hoitokaynit')
    .select('id, pvm')
    .gte('pvm', viikkoAgo)

  if (error) {
    console.error('Virhe:', error)
    return 0
  }
  return data.length
}

export const poistaAsiakas = async (id) => {
  await supabase
    .from('hoitokaynit')
    .delete()
    .eq('asiakas_id', id)

  const { error } = await supabase
    .from('asiakkaat')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Poisto epäonnistui:', error)
    return false
  }
  return true
}

// Sivulatausta kohden vain yksi haku — sairauslista ei muutu session aikana
let _sairausTyyppiCache = null

export const haeSairausTyypit = async () => {
  if (_sairausTyyppiCache) return _sairausTyyppiCache
  const { data, error } = await supabase
    .from('sairaus_tyypit')
    .select('id, koodi, nimi, kontraindikaatio, ryhma, jarjestys, tarkenne_label, tarkenne_tyyppi')
    .eq('aktiivinen', true)
    .order('jarjestys', { ascending: true, nullsFirst: false })
    .order('nimi')
  if (error) {
    console.error('[haeSairausTyypit] virhe:', error)
    return []
  }
  _sairausTyyppiCache = data ?? []
  return _sairausTyyppiCache
}

export const varmistaTaiLuoVersio = async (asiakasId) => {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: olemassa } = await supabase
    .from('asiakastietolomake_versiot')
    .select('id')
    .eq('asiakas_id', asiakasId)
    .is('voimassa_asti', null)
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (olemassa) return olemassa.id

  const { data: uusi, error } = await supabase
    .from('asiakastietolomake_versiot')
    .insert({ asiakas_id: asiakasId, muokkaaja_id: user.id, muokkaaja_rooli: 'hoitaja' })
    .select('id')
    .single()

  if (error) { console.error('Version luonti:', error); return null }
  return uusi.id
}

export const paivitaSairausValinta = async (versioId, sairausTyyppiId, onPaalla, tarkenne) => {
  await supabase
    .from('lomake_sairaudet')
    .delete()
    .eq('lomake_versio_id', versioId)
    .eq('sairaus_tyyppi_id', sairausTyyppiId)

  if (!onPaalla) return true

  const { error } = await supabase
    .from('lomake_sairaudet')
    .insert({
      lomake_versio_id:  versioId,
      sairaus_tyyppi_id: sairausTyyppiId,
      on_voimassa:       true,
      tarkenne:          tarkenne || null,
    })

  if (error) { console.error('Sairauden tallennus:', error); return false }
  return true
}

export const haeLomakeTekstikentat = async (asiakasId) => {
  const { data } = await supabase
    .from('asiakastietolomake_versiot')
    .select('laakitys, diagnosoidut_sairaudet, vammat_huomiot')
    .eq('asiakas_id', asiakasId)
    .is('voimassa_asti', null)
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

export const paivitaLomakeTekstikentat = async (asiakasId, data) => {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: versio } = await supabase
    .from('asiakastietolomake_versiot')
    .select('id')
    .eq('asiakas_id', asiakasId)
    .is('voimassa_asti', null)
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (versio) {
    const { error } = await supabase
      .from('asiakastietolomake_versiot')
      .update({
        laakitys:               data.laakitys               || null,
        diagnosoidut_sairaudet: data.diagnosoidut_sairaudet || null,
        vammat_huomiot:         data.vammat_huomiot         || null,
        muokkaaja_id:           user.id,
      })
      .eq('id', versio.id)
    if (error) { console.error('Tekstikenttien tallennus:', error); return false }
    return true
  }

  const { error } = await supabase
    .from('asiakastietolomake_versiot')
    .insert({
      asiakas_id:             asiakasId,
      laakitys:               data.laakitys               || null,
      diagnosoidut_sairaudet: data.diagnosoidut_sairaudet || null,
      vammat_huomiot:         data.vammat_huomiot         || null,
      muokkaaja_id:           user.id,
      muokkaaja_rooli:        'hoitaja',
    })
  if (error) { console.error('Tekstikenttien tallennus:', error); return false }
  return true
}

export const haeAsiakkaanSairaudet = async (asiakasId) => {
  // Vaihe 1: hae nykyinen versio-id (ei embed-filtteriä, toimii varmasti)
  const { data: versio } = await supabase
    .from('asiakastietolomake_versiot')
    .select('id')
    .eq('asiakas_id', asiakasId)
    .is('voimassa_asti', null)
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!versio) return []

  // Vaihe 2: hae sairaudet tälle versiolle
  const { data, error } = await supabase
    .from('lomake_sairaudet')
    .select(`
      id,
      on_voimassa,
      tarkenne,
      sairaus_tyyppi:sairaus_tyypit (
        id,
        koodi,
        nimi,
        kontraindikaatio
      )
    `)
    .eq('lomake_versio_id', versio.id)
    .eq('on_voimassa', true)

  if (error) {
    console.error('Sairauksien haku epäonnistui:', error)
    return []
  }
  return data ?? []
}

// ─── Palvelut ─────────────────────────────────────────────────────────
// Suhde palvelu↔lomakepohja: 1:N (yksi palvelu → yksi pohja, sama pohja
// voi olla monessa palvelussa). Pohjan id on palvelut.lomakepohja_id.

export const haePalvelut = async () => {
  const { data, error } = await supabase
    .from('palvelut')
    .select('id, nimi, kuvaus, kesto_min, hinta_eur, varauslinkki_url, jarjestys, aktiivinen, lomakepohja_id, hoitosarjan_pituus, luotu, paivitetty, lomakepohjat:lomakepohja_id(id, nimi, aktiivinen)')
    .order('jarjestys', { ascending: true })
    .order('nimi', { ascending: true })

  if (error) {
    console.error('Palveluiden haku epäonnistui:', error)
    return []
  }
  return (data ?? []).map((p) => ({
    ...p,
    lomakepohja: p.lomakepohjat ?? null,
  }))
}

export const luoPalvelu = async ({ nimi, kuvaus = '', kesto_min = null, hinta_eur = null, varauslinkki_url = '', lomakepohja_id = null, hoitosarjan_pituus = null }) => {
  if (!nimi?.trim()) return { virhe: 'Nimi puuttuu' }
  const { data: { user }, error: userVirhe } = await supabase.auth.getUser()
  if (userVirhe || !user) return { virhe: 'Kirjautuminen vaaditaan' }

  const { data, error } = await supabase
    .from('palvelut')
    .insert({
      hoitaja_id:         user.id,
      nimi:               nimi.trim(),
      kuvaus:             kuvaus?.trim() || null,
      kesto_min:          kesto_min ?? null,
      hinta_eur:          hinta_eur ?? null,
      varauslinkki_url:   varauslinkki_url?.trim() || null,
      lomakepohja_id:     lomakepohja_id ?? null,
      hoitosarjan_pituus: hoitosarjan_pituus ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Palvelun luonti epäonnistui:', error)
    return { virhe: error.message }
  }
  return { id: data.id, virhe: null }
}

export const paivitaPalvelu = async (id, { nimi, kuvaus, kesto_min, hinta_eur, varauslinkki_url, jarjestys, aktiivinen, lomakepohja_id, hoitosarjan_pituus }) => {
  const muutokset = { paivitetty: new Date().toISOString() }
  if (nimi !== undefined)               muutokset.nimi = nimi.trim()
  if (kuvaus !== undefined)             muutokset.kuvaus = kuvaus?.trim() || null
  if (kesto_min !== undefined)          muutokset.kesto_min = kesto_min
  if (hinta_eur !== undefined)          muutokset.hinta_eur = hinta_eur
  if (varauslinkki_url !== undefined)   muutokset.varauslinkki_url = varauslinkki_url?.trim() || null
  if (jarjestys !== undefined)          muutokset.jarjestys = jarjestys
  if (aktiivinen !== undefined)         muutokset.aktiivinen = aktiivinen
  if (lomakepohja_id !== undefined)     muutokset.lomakepohja_id = lomakepohja_id
  if (hoitosarjan_pituus !== undefined) muutokset.hoitosarjan_pituus = hoitosarjan_pituus

  const { error } = await supabase
    .from('palvelut')
    .update(muutokset)
    .eq('id', id)

  if (error) {
    console.error('Palvelun päivitys epäonnistui:', error)
    return { virhe: error.message }
  }
  return { virhe: null }
}

export const poistaPalvelu = async (id) => {
  const { error } = await supabase
    .from('palvelut')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Palvelun poisto epäonnistui:', error)
    return { virhe: error.message }
  }
  return { virhe: null }
}

// Asettaa palvelulle lomakepohjan (1:N — yksinkertainen UPDATE).
// pohjaId voi olla null jos halutaan irrottaa.
export const asetaPalvelunLomake = async (palveluId, pohjaId) => {
  return paivitaPalvelu(palveluId, { lomakepohja_id: pohjaId ?? null })
}

// Hakee palveluiden listan johon tämä pohja on liitetty (1:N — käänteinen suunta).
// Käytetään editorin näkymässä jossa halutaan näyttää "tätä pohjaa käyttävät palvelut".
export const haePalvelutPohjalle = async (pohjaId) => {
  const { data, error } = await supabase
    .from('palvelut')
    .select('id, nimi, aktiivinen')
    .eq('lomakepohja_id', pohjaId)
    .order('nimi')

  if (error) {
    console.error('Pohjan palveluiden haku epäonnistui:', error)
    return []
  }
  return data ?? []
}

// Luo uuden kentän kenttäkirjastoon (rivit kenttakirjasto + kentan_versiot).
// Tunniste on uniikki per hoitaja — tarkistus tietokannan UNIQUE-rajoituksen kautta.
export const luoUusiKentta = async ({
  tunniste,
  tyyppi,
  otsikko,
  apurivi = '',
  placeholder = '',
  virheilmoitus = '',
  sisalto = '',
  validointi = {},
  oletukset = {},
}) => {
  if (!tunniste?.trim()) return { virhe: 'Tunniste puuttuu' }
  if (!tyyppi)           return { virhe: 'Kenttätyyppi puuttuu' }
  if (!otsikko?.trim())  return { virhe: 'Otsikko puuttuu' }

  const { data: { user }, error: userVirhe } = await supabase.auth.getUser()
  if (userVirhe || !user) return { virhe: 'Kirjautuminen vaaditaan' }

  const { data: kentta, error: kenttaVirhe } = await supabase
    .from('kenttakirjasto')
    .insert({
      hoitaja_id:         user.id,
      kentta_id_tunniste: tunniste.trim(),
      kenttatyyppi:       tyyppi,
      validointi,
      oletukset,
    })
    .select('id')
    .single()

  if (kenttaVirhe) {
    if (kenttaVirhe.code === '23505') return { virhe: `Tunniste "${tunniste}" on jo käytössä — valitse toinen` }
    console.error('Uuden kentän tallennus:', kenttaVirhe)
    return { virhe: `Kentän tallennus: ${kenttaVirhe.message}` }
  }

  const { error: versioVirhe } = await supabase
    .from('kentan_versiot')
    .insert({
      kentta_id: kentta.id,
      versio:    1,
      kaannokset: {
        fi: {
          otsikko:       otsikko.trim(),
          apurivi:       apurivi?.trim() ?? '',
          placeholder:   placeholder?.trim() ?? '',
          virheilmoitus: virheilmoitus?.trim() ?? '',
          sisalto:       sisalto?.trim() ?? '',
        },
        en: { otsikko: '', apurivi: '', placeholder: '', virheilmoitus: '', sisalto: '' },
      },
      aktiivinen: true,
    })

  if (versioVirhe) {
    console.error('Käännösten tallennus:', versioVirhe)
    return { virhe: `Käännösten tallennus: ${versioVirhe.message}` }
  }

  return { kenttaId: kentta.id, tunniste: tunniste.trim(), virhe: null }
}

// Hakee koko kenttäkirjaston editorin käyttöön — kentän tunniste + tyyppi + suomenkielinen otsikko.
// Palautusmuoto: [{ id, tunniste, tyyppi, otsikko, apurivi, placeholder, validointi, oletukset }]
export const haeKenttakirjasto = async () => {
  const { data, error } = await supabase
    .from('kenttakirjasto')
    .select('id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset, kentan_versiot(versio, kaannokset, aktiivinen)')
    .order('kentta_id_tunniste')

  if (error) {
    console.error('Kenttäkirjaston haku epäonnistui:', error)
    return []
  }

  return (data ?? []).map((k) => {
    const v = (k.kentan_versiot ?? [])
      .filter((x) => x.aktiivinen)
      .sort((a, b) => b.versio - a.versio)[0]
    const fi = v?.kaannokset?.fi ?? {}
    return {
      id:          k.id,
      tunniste:    k.kentta_id_tunniste,
      tyyppi:      k.kenttatyyppi,
      otsikko:     fi.otsikko ?? k.kentta_id_tunniste,
      apurivi:     fi.apurivi ?? '',
      placeholder: fi.placeholder ?? '',
      sisalto:     fi.sisalto ?? '',
      validointi:  k.validointi ?? {},
      oletukset:   k.oletukset ?? {},
    }
  })
}

export const haeOletusLomakepohjaId = async () => {
  const { data, error } = await supabase
    .from('lomakepohjat')
    .select('id')
    .eq('on_oletus', true)
    .eq('aktiivinen', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Oletuspohjan haku epäonnistui:', error)
    return null
  }
  return data?.id ?? null
}

export const haeLomakepohja = async (pohjaId) => {
  if (!pohjaId) return { pohja: null, rakenne: null, kentat: {}, virhe: 'Pohjan id puuttuu' }

  const { data: pohjaRivi, error: pohjaVirhe } = await supabase
    .from('lomakepohjat')
    .select('id, nimi, kuvaus, on_oletus, aktiivinen, lomakepohja_versiot(versio, rakenne)')
    .eq('id', pohjaId)
    .single()

  if (pohjaVirhe || !pohjaRivi) {
    return { pohja: null, rakenne: null, kentat: {}, virhe: 'Pohjaa ei löytynyt' }
  }

  const versiot = (pohjaRivi.lomakepohja_versiot ?? []).slice().sort((a, b) => b.versio - a.versio)
  const rakenne = versiot[0]?.rakenne ?? null
  if (!rakenne) {
    return { pohja: pohjaRivi, rakenne: null, kentat: {}, virhe: 'Pohjalla ei ole versiota' }
  }

  const tunnisteet = []
  for (const osio of rakenne.osiot ?? []) {
    for (const kf of osio.kenttat ?? []) {
      if (kf.kentta_id_tunniste) tunnisteet.push(kf.kentta_id_tunniste)
    }
  }

  let kentat = {}
  if (tunnisteet.length > 0) {
    const { data: kenttaRivit, error: kenttaVirhe } = await supabase
      .from('kenttakirjasto')
      .select('id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset, kentan_versiot(versio, kaannokset)')
      .in('kentta_id_tunniste', tunnisteet)

    if (kenttaVirhe) {
      return { pohja: pohjaRivi, rakenne, kentat: {}, virhe: 'Kenttien haku epäonnistui' }
    }

    for (const k of kenttaRivit ?? []) {
      const v = (k.kentan_versiot ?? []).slice().sort((a, b) => b.versio - a.versio)[0]
      kentat[k.kentta_id_tunniste] = {
        id:           k.id,
        tunniste:     k.kentta_id_tunniste,
        tyyppi:       k.kenttatyyppi,
        validointi:   k.validointi ?? {},
        oletukset:    k.oletukset ?? {},
        kaannokset:   v?.kaannokset ?? {},
      }
    }
  }

  const { lomakepohja_versiot: _, ...pohjaIlmanVersioita } = pohjaRivi
  return { pohja: pohjaIlmanVersioita, rakenne, kentat, virhe: null }
}

// Tallentaa lomakerenderöijän vastaukset asiakkaaksi + lomakeversioksi.
// Logiikka:
//   - Asiakas: upsert (uusi tai päivitys olemassaolevaan)
//   - Lomakeversio: jos asiakkaalla on jo voimassa oleva versio
//     (voimassa_asti IS NULL), PÄIVITETÄÄN sitä in-place. Muuten luodaan
//     uusi versio. Tämä pitää lomakkeen yhtenä rivinä per asiakas joka
//     päivittyy ajan mittaan.
//   - Sairaudet: delete-then-insert (yksinkertaisin tapa pitää lista
//     synkronissa renderöijän nykytilan kanssa)
//   - Lisäkentät: jsonb-sarakkeeseen asiakastietolomake_versiot.lisakentat
export const tallennaRenderoijastaLomake = async ({ vastaukset, asiakasIdJosOlemassa = null, muokkaajaRooli = 'hoitaja', otsikko = null }) => {
  const { data: { user }, error: userVirhe } = await supabase.auth.getUser()
  if (userVirhe || !user) return { virhe: 'Kirjautuminen vaaditaan' }

  const jaettu = jaaVastaukset(vastaukset)

  // 1. Asiakas — upsert
  const asiakasRivi = {
    ...jaettu.asiakas,
    hoitaja_id: user.id,
    paivitetty: new Date().toISOString(),
  }
  if (asiakasIdJosOlemassa) asiakasRivi.id = asiakasIdJosOlemassa

  const { data: asiakas, error: asiakasVirhe } = await supabase
    .from('asiakkaat')
    .upsert(asiakasRivi)
    .select('id')
    .single()

  if (asiakasVirhe) {
    console.error('Asiakkaan tallennus epäonnistui:', asiakasVirhe)
    return { virhe: `Asiakkaan tallennus: ${asiakasVirhe.message}` }
  }

  // 2. Etsi voimassa oleva versio (jos on)
  const { data: olemassaVersio } = await supabase
    .from('asiakastietolomake_versiot')
    .select('id')
    .eq('asiakas_id', asiakas.id)
    .is('voimassa_asti', null)
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 3. UPDATE jos olemassa, INSERT muuten
  // Otsikko on käynnin tason ominaisuus (E1) — talletetaan vain jos kutsuja
  // antoi sen eksplisiittisesti (eli ei-undefined).
  const lisaaOtsikko = otsikko !== undefined
    ? { otsikko: (typeof otsikko === 'string' ? otsikko.trim() : otsikko) || null }
    : {}
  let versioId
  if (olemassaVersio) {
    const { error: paivitysVirhe } = await supabase
      .from('asiakastietolomake_versiot')
      .update({
        ...jaettu.lomake,
        ...lisaaOtsikko,
        lisakentat:      jaettu.lisakentat,
        muokkaaja_id:    user.id,
        muokkaaja_rooli: muokkaajaRooli,
      })
      .eq('id', olemassaVersio.id)

    if (paivitysVirhe) {
      console.error('Lomakeversion päivitys epäonnistui:', paivitysVirhe)
      return { virhe: `Lomakeversion päivitys: ${paivitysVirhe.message}`, asiakasId: asiakas.id }
    }
    versioId = olemassaVersio.id

    // Sairaudet: tyhjennä ja lisää uudelleen jotta lista vastaa nykyistä tilaa
    const { error: poistoVirhe } = await supabase
      .from('lomake_sairaudet')
      .delete()
      .eq('lomake_versio_id', versioId)
    if (poistoVirhe) {
      console.error('Sairauksien tyhjennys epäonnistui:', poistoVirhe)
      return { virhe: `Sairauksien tyhjennys: ${poistoVirhe.message}`, asiakasId: asiakas.id, lomakeVersioId: versioId }
    }
  } else {
    const { data: uusi, error: versioVirhe } = await supabase
      .from('asiakastietolomake_versiot')
      .insert({
        asiakas_id:      asiakas.id,
        ...jaettu.lomake,
        ...lisaaOtsikko,
        lisakentat:      jaettu.lisakentat,
        muokkaaja_id:    user.id,
        muokkaaja_rooli: muokkaajaRooli,
      })
      .select('id')
      .single()

    if (versioVirhe) {
      console.error('Lomakeversion tallennus epäonnistui:', versioVirhe)
      return { virhe: `Lomakeversion tallennus: ${versioVirhe.message}`, asiakasId: asiakas.id }
    }
    versioId = uusi.id
  }

  // 4. Sairaudet → lomake_sairaudet
  if (jaettu.sairaudet.length > 0) {
    const rivit = jaettu.sairaudet.map((sairausTyyppiId) => ({
      lomake_versio_id:  versioId,
      sairaus_tyyppi_id: sairausTyyppiId,
      on_voimassa:       true,
    }))
    const { error: sairaudetVirhe } = await supabase.from('lomake_sairaudet').insert(rivit)
    if (sairaudetVirhe) {
      console.error('Sairauksien tallennus epäonnistui:', sairaudetVirhe)
      return {
        virhe:          `Sairauksien tallennus: ${sairaudetVirhe.message}`,
        asiakasId:      asiakas.id,
        lomakeVersioId: versioId,
      }
    }
  }

  return {
    asiakasId:      asiakas.id,
    lomakeVersioId: versioId,
    virhe:          null,
  }
}
