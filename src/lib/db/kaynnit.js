// Kehokorjaamo-App — hoitokäynti-pohjaiset DB-funktiot
//
// Tämä moduuli sisältää B-lomakkeen (hoitokaynnit-taulu) tallennus-,
// haku- ja mittarilukemafunktiot: uuden käynnin aloitus, hoitokirjauksen
// optimistinen lukko, BodyMap-havainnot, edellisten mittarien vertailu,
// käynti-listaukset.
//
// Funktiot re-exportoidaan db.js:n barrel-vientipisteen kautta, joten
// komponenttien import-polut (`import { ... } from '../lib/db'`) toimivat
// edelleen ilman muutoksia.

import { supabase } from '../supabase'

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

// Hoitokäyntien lukumäärä asiakkaalle — käytetään hoitokirjauksen
// "Käynti N" -juoksevassa numerossa.
//
// Laskuri sulkee pois 'odottaa_kayntia'-rivit (tyhjät B-lomakkeet jotka
// odottavat ensimmäistä käyntiä). N = tehdyt käynnit + nykyinen luonnos
// = todellinen käyntinumero kun käyttäjä on hoitokirjauksessa.
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
    // Pala B3 — linjausmittarit (9 aktiivista)
    // Legacy-sarakkeet (paan_eteen_tyontyminen_cm, skolioosin_kierto_aste,
    // niskan_kaannos_vasen/oikea_aste, akillesjanteen_kulma_vasen/oikea_aste)
    // poistettu UI:sta 2026-05-02 — DB-sarake säilyy mutta ei kirjoiteta uutta.
    'lantion_kallistus_aste', 'lantion_sivuttainen_aste', 'lantion_kierto_aste',
    'olkapaiden_korkeusero_cm',
    'q_kulma_vasen_aste', 'q_kulma_oikea_aste',
    'jalkapituus_ero_cm',
    'navicular_drop_vasen_mm', 'navicular_drop_oikea_mm',
    // Jatkohoitosuunnitelma
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
    .select('lantion_kallistus_aste, lantion_sivuttainen_aste, lantion_kierto_aste, olkapaiden_korkeusero_cm, q_kulma_vasen_aste, q_kulma_oikea_aste, jalkapituus_ero_cm, navicular_drop_vasen_mm, navicular_drop_oikea_mm, pvm')
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
