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

// Hakee asiakkaan menneiden hoitokäyntien päivämäärät — kaikki suljetut
// lomakeversiot (voimassa_asti IS NOT NULL) uusimmasta vanhimpaan.
// Jokainen rivi vastaa yhtä mennyttä hoitokäyntiä; aktiivinen avoin
// versio jätetään pois.
//
// rajoitus: jos annettu (esim. 4), palautetaan korkeintaan N uusinta.
// Käytetään Asiakasrekisterin pillerinäkymässä jossa näytetään 4 uusinta.
// Käyntihistoria-listalla rajoitus jätetään null:ksi → kaikki käynnit.
export const haeKayntienPaivamaarat = async (asiakasId, rajoitus = null) => {
  if (!asiakasId) return []
  let query = supabase
    .from('asiakastietolomake_versiot')
    .select('id, voimassa_alkaen')
    .eq('asiakas_id', asiakasId)
    .not('voimassa_asti', 'is', null)
    .order('voimassa_alkaen', { ascending: false })
  if (typeof rajoitus === 'number' && rajoitus > 0) query = query.limit(rajoitus)

  const { data, error } = await query
  if (error) {
    console.error('Käyntien päivämäärien haku epäonnistui:', error)
    return []
  }
  return data ?? []
}

// Hakee yksittäisen lomakeversion täydet tiedot + sairaudet — käytetään
// käyntihistorian read-only-modaalissa jossa näytetään yksi vanhentunut
// versio sellaisena kuin se oli sulkemishetkellä.
export const haeLomakeversio = async (lomakeVersioId) => {
  if (!lomakeVersioId) return { versio: null, sairaudet: [] }

  const { data: versio, error: versioVirhe } = await supabase
    .from('asiakastietolomake_versiot')
    .select('id, hoitoon_syy, kipu_taso, laakitys, diagnosoidut_sairaudet, vammat_huomiot, harrastukset, lisakentat, muokkaaja_rooli, voimassa_alkaen, voimassa_asti, luotu')
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
    .select('id, hoitoon_syy, kipu_taso, laakitys, diagnosoidut_sairaudet, vammat_huomiot, harrastukset, lisakentat, muokkaaja_rooli, luotu')
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
      return {
        lomakeVersioId: uusi.id,
        virhe:          null,
        varoitus:       `Uusi käynti aloitettu mutta sairauksia ei kopioitu: ${kopiointiVirhe.message}`,
      }
    }
  }

  return { lomakeVersioId: uusi.id, virhe: null }
}

// Vahvistaa julkisen lomakkeen kautta tulleen asiakkaan — siirtää hänet
// Asiakasrekisterin "Uudet asiakkaat" -osiosta normaaliin asiakaslistaan.
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
  console.log('[haeSairausTyypit] kutsuttu (ei cachea)')
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
  const lista = data ?? []
  console.log('[haeSairausTyypit] tulos:', lista.length, 'riviä — tallennettu cacheen')
  _sairausTyyppiCache = lista
  return lista
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
    .select('id, nimi, kuvaus, kesto_min, hinta_eur, varauslinkki_url, jarjestys, aktiivinen, lomakepohja_id, luotu, paivitetty, lomakepohjat:lomakepohja_id(id, nimi, aktiivinen)')
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

export const luoPalvelu = async ({ nimi, kuvaus = '', kesto_min = null, hinta_eur = null, varauslinkki_url = '', lomakepohja_id = null }) => {
  if (!nimi?.trim()) return { virhe: 'Nimi puuttuu' }
  const { data: { user }, error: userVirhe } = await supabase.auth.getUser()
  if (userVirhe || !user) return { virhe: 'Kirjautuminen vaaditaan' }

  const { data, error } = await supabase
    .from('palvelut')
    .insert({
      hoitaja_id:       user.id,
      nimi:             nimi.trim(),
      kuvaus:           kuvaus?.trim() || null,
      kesto_min:        kesto_min ?? null,
      hinta_eur:        hinta_eur ?? null,
      varauslinkki_url: varauslinkki_url?.trim() || null,
      lomakepohja_id:   lomakepohja_id ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Palvelun luonti epäonnistui:', error)
    return { virhe: error.message }
  }
  return { id: data.id, virhe: null }
}

export const paivitaPalvelu = async (id, { nimi, kuvaus, kesto_min, hinta_eur, varauslinkki_url, jarjestys, aktiivinen, lomakepohja_id }) => {
  const muutokset = { paivitetty: new Date().toISOString() }
  if (nimi !== undefined)             muutokset.nimi = nimi.trim()
  if (kuvaus !== undefined)           muutokset.kuvaus = kuvaus?.trim() || null
  if (kesto_min !== undefined)        muutokset.kesto_min = kesto_min
  if (hinta_eur !== undefined)        muutokset.hinta_eur = hinta_eur
  if (varauslinkki_url !== undefined) muutokset.varauslinkki_url = varauslinkki_url?.trim() || null
  if (jarjestys !== undefined)        muutokset.jarjestys = jarjestys
  if (aktiivinen !== undefined)       muutokset.aktiivinen = aktiivinen
  if (lomakepohja_id !== undefined)   muutokset.lomakepohja_id = lomakepohja_id

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
export const tallennaRenderoijastaLomake = async ({ vastaukset, asiakasIdJosOlemassa = null, muokkaajaRooli = 'hoitaja' }) => {
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
  let versioId
  if (olemassaVersio) {
    const { error: paivitysVirhe } = await supabase
      .from('asiakastietolomake_versiot')
      .update({
        ...jaettu.lomake,
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
