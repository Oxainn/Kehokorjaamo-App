// Kehokorjaamo-App — asiakas-pohjaiset DB-funktiot
//
// Tämä moduuli sisältää funktiot jotka käsittelevät `asiakkaat`-taulua
// ja siihen liittyvää tietoa: perustiedot, arkistointi, vahvistus,
// kontraindikaatiot, kehonkartta-merkinnät, lomakehistoria, sairaudet
// ja käyntien päivämäärät.
//
// Funktiot re-exportoidaan db.js:n barrel-vientipisteen kautta, joten
// komponenttien import-polut (`import { ... } from '../lib/db'`) toimivat
// edelleen ilman muutoksia.

import { supabase } from '../supabase'

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

// Hakee asiakkaan KAIKKI A-lomakeversiot (uusin ensin) lisakentät-
// kentän kanssa. Käytetään AsiakkaanOireet-näkymässä vertailuun
// aiempiin käynteihin (osa 3: aikajana + muutos-listat).
export const haeAsiakkaanLomakeHistoria = async (asiakasId) => {
  if (!asiakasId) return []
  const { data, error } = await supabase
    .from('asiakastietolomake_versiot')
    .select('id, versio_nro, voimassa_alkaen, voimassa_asti, lisakentat, luotu, otsikko')
    .eq('asiakas_id', asiakasId)
    .order('voimassa_alkaen', { ascending: false })
  if (error) {
    console.error('Lomakehistorian haku epäonnistui:', error)
    return []
  }
  return data ?? []
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
// Jokainen rivi sisältää kayntinumero-kentän — juokseva numerointi
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
