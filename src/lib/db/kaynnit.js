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

  // Jos avointa versiota ei ole, luodaan tyhjä A-lomakeversio JA hoitokaynnit-rivi.
  // Tämä reunatapaus laukeaa kun "+ Uusi asiakas" -polku on käytössä:
  //   luoTyhjaAsiakas() luo pelkän asiakas-rivin, ei A-versiota → täällä luodaan molemmat.
  // Pala 2.19 korjaus: aiemmin tämä haara palautti vain lomakeVersioId:n eikä
  //   hoitokayntiId:tä → UusiKayntiContainer näytti virheen "Käyntiä ei luotu".
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

    // Luo myös hoitokaynnit-rivi joka osoittaa juuri luotuun A-versioon.
    // Snapshot-mallin mukaisesti: B-lomake on linkattu siihen A-versioon
    // joka oli voimassa hoidon alkaessa (tässä tapauksessa juuri luotu).
    const { data: hoitokaynti, error: hoitokayntiVirhe } = await supabase
      .from('hoitokaynnit')
      .insert({
        asiakas_id:       asiakasId,
        hoitaja_id:       user.id,
        lomake_versio_id: uusi.id,
        pvm:              new Date().toISOString(),
        tila:             'luonnos',
        vastaukset:       {},
      })
      .select('id')
      .single()
    if (hoitokayntiVirhe) {
      console.warn('Hoitokaynnit-rivin luonti epäonnistui:', hoitokayntiVirhe)
      return {
        lomakeVersioId: uusi.id,
        hoitokayntiId:  null,
        virhe:          null,
        varoitus:       `Lomakeversio luotu mutta käynti ei: ${hoitokayntiVirhe.message}`,
      }
    }

    return {
      lomakeVersioId: uusi.id,
      hoitokayntiId:  hoitokaynti.id,
      virhe:          null,
    }
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

  // AB-T4d: hae edellisen valmis-käynnin pysyvät vastaukset uuden käynnin
  // alkuun. Pysyvät kentät (kentan_versiot.pysyva = true) säilyvät
  // esitäytettyinä, muuttuvat jäävät tyhjiksi.
  //
  // Defensive: jos haku epäonnistuu, jatkamme ilman pysyviä — käynnin
  // aloittaminen ei saa kaatua tähän. Hoitaja voi täyttää kentät käsin.
  let pysyvatVastaukset = {}
  try {
    const { data: edellinen } = await supabase
      .from('hoitokaynnit')
      .select('vastaukset')
      .eq('asiakas_id', asiakasId)
      .eq('tila', 'valmis')
      .order('luotu', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (edellinen?.vastaukset
        && typeof edellinen.vastaukset === 'object'
        && !Array.isArray(edellinen.vastaukset)
        && Object.keys(edellinen.vastaukset).length > 0) {
      // Hae kenttäkirjasto — kerää lista kenttä-tunnisteista joilla pysyva=true
      const { data: kentat } = await supabase
        .from('kenttakirjasto')
        .select('kentta_id_tunniste, kentan_versiot(versio, aktiivinen, pysyva)')

      if (kentat) {
        const pysyvienTunnisteet = new Set()
        for (const k of kentat) {
          const v = (k.kentan_versiot ?? [])
            .filter((x) => x.aktiivinen)
            .sort((a, b) => b.versio - a.versio)[0]
          if (v?.pysyva) pysyvienTunnisteet.add(k.kentta_id_tunniste)
        }
        // Suodata edellisen vastaukset: vain pysyvien arvot
        for (const [tunniste, arvo] of Object.entries(edellinen.vastaukset)) {
          if (pysyvienTunnisteet.has(tunniste)) {
            pysyvatVastaukset[tunniste] = arvo
          }
        }
      }
    }
  } catch (e) {
    console.warn('Edellisen käynnin pysyvien kopiointi epäonnistui:', e)
    pysyvatVastaukset = {}
  }

  // 6. Käytä olemassa olevaa tyhjää B-lomaketta jos sellainen on
  // (asiakkaan vahvistuksessa luotu odottaa_kayntia-rivi). Muuten luo uusi.
  // Snapshot-malli: hoitokerta osoittaa siihen A-lomakkeen versioon joka
  // oli voimassa hoidon alkaessa (juuri suljettu), ei uuteen avoimeen.
  const bLomakePaivitys = {
    lomake_versio_id: avoin.id,   // A-lomake (asiakastietolomake_versiot)
    pvm:              nyt,
    tila:             'luonnos',
    vastaukset:       pysyvatVastaukset,
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
// Päättelee viimeisimmästä valmis-käynnistä palvelun, jota uusi käynti voi
// käyttää ilman erillistä palveluvalintaa. Käytetään Asiakasrekisterin
// "+ Aloita käynti" -napin asynkronisessa polussa: jos asiakkaalla on aiempi
// valmis-käynti ja sen lomakepohja kuuluu yksiselitteisesti yhteen aktiiviseen
// palveluun, ohitamme HoitajanPalveluValinta-modaalin ja avaamme suoraan
// kyseisen palvelun lomakkeen (uusi käynti, AB-T4d kopioi pysyvät vastaukset).
//
// Polku tietokannassa:
//   hoitokaynnit.lomakepohja_versio_id (Pala 2.24) → lomakepohja_versiot.pohja_id
//   → palvelut WHERE lomakepohja_id = pohja_id AND aktiivinen = true
//
// Reuna-tapaukset palauttavat ohitaPalveluvalinta=false → kutsuva komponentti
// näyttää palveluvalinnan varmuuden vuoksi:
//   - vanha käynti ilman lomakepohja_versio_id:tä (ennen 2026-05-05)
//   - lomakepohja on poistettu (versio-rivi voi silti olla, FK SET NULL)
//   - pohja löytyy useammassa palvelussa (1:N -suhde sallii tämän)
//   - pohjan ainoa palvelu on aktiivinen=false
export const haeViimeisinKayntiPalvelulla = async (asiakasId) => {
  const tyhjaTulos = { palvelu: null, ohitaPalveluvalinta: false }
  if (!asiakasId) return tyhjaTulos

  const { data: kaynti, error: kayntiVirhe } = await supabase
    .from('hoitokaynnit')
    .select('id, lomakepohja_versio_id')
    .eq('asiakas_id', asiakasId)
    .eq('tila', 'valmis')
    .not('pvm', 'is', null)
    .not('lomakepohja_versio_id', 'is', null)
    .order('pvm', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (kayntiVirhe || !kaynti?.lomakepohja_versio_id) return tyhjaTulos

  const { data: versio, error: versioVirhe } = await supabase
    .from('lomakepohja_versiot')
    .select('pohja_id')
    .eq('id', kaynti.lomakepohja_versio_id)
    .maybeSingle()
  if (versioVirhe || !versio?.pohja_id) return tyhjaTulos

  const { data: palvelut, error: palveluVirhe } = await supabase
    .from('palvelut')
    .select('id, nimi, lomakepohja_id, aktiivinen')
    .eq('lomakepohja_id', versio.pohja_id)
    .eq('aktiivinen', true)
  if (palveluVirhe || !palvelut || palvelut.length !== 1) return tyhjaTulos

  return { palvelu: palvelut[0], ohitaPalveluvalinta: true }
}

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

// ─── A+B-yhdistetty lomake (AB-T4) ─────────────────────────────────────────
// Vaihtoehto Z (hybrid): asiakas-perustiedot säilyy asiakkaat-taulussa,
// kaikki muut lomake-vastaukset → hoitokaynnit.vastaukset jsonbiin.

// Tallenna A+B-lomakkeen vastaukset hoitokayntiin. Auto-save:n päätoiminto.
//
// Optimistinen lukko hoitokaynnit.versio:n kautta — sama mekanismi kuin
// tallennaHoitokirjaus. Jos versio annettu (number) ja DB:n versio on suurempi,
// joku muu on tallentanut välissä → palauta { ristiriita: true, nykyinenVersio }.
// Jos odotettuVersio = null, lukko ohitetaan (uusi luonnos jossa ei vielä versiota).
//
// Palauttaa: { virhe: null, versio } | { virhe: msg } | { ristiriita: true, ... }
export const tallennaKayntiVastauksilla = async (hoitokayntiId, vastaukset, odotettuVersio = null) => {
  if (!hoitokayntiId) return { virhe: 'Hoitokaynti-id puuttuu' }
  if (!vastaukset || typeof vastaukset !== 'object' || Array.isArray(vastaukset)) {
    return { virhe: 'Vastaukset puuttuvat tai virheellinen muoto' }
  }

  const muutokset = {
    vastaukset,
    paivitetty: new Date().toISOString(),
    versio:     (odotettuVersio ?? 0) + 1,
  }

  let kysely = supabase
    .from('hoitokaynnit')
    .update(muutokset)
    .eq('id', hoitokayntiId)
  if (odotettuVersio !== null) kysely = kysely.eq('versio', odotettuVersio)

  const { data, error } = await kysely.select('id, versio')
  if (error) {
    console.error('Käynnin vastausten tallennus epäonnistui:', error)
    return { virhe: error.message }
  }
  if (odotettuVersio !== null && (!data || data.length === 0)) {
    // Versio ei täsmännyt → joku muu tallentanut välissä
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

// Hae käynnin vastaukset tukien sekä uutta (AB-T4) että vanhaa formaattia.
//
// Uusi käynti: vastaukset hoitokaynnit.vastaukset jsonbissa.
// Vanha käynti (ennen AB-T4): vastaukset hajautettu asiakastietolomake_versiot-
//   tauluun (lomake-sarakkeet + lisakentat-jsonb). Lomakekenttien (hoitoon_syy
//   jne) takaisinmappausta uuteen formaattiin EI tehdä — palautetaan vain
//   lisakentat-jsonb joka on jo renderöijän vastaukset-formaatissa. AB-T8:ssa
//   katsotaan tarvitaanko tarkka mappaus tai jätetäänkö vanhat read-only-tilaan
//   omassa Hoitokirjaus.jsx-näkymässään.
//
// Palauttaa: { vastaukset, tila, versio, otsikko, pvm, lahde } | null
//   lahde = 'hoitokaynnit' (uusi) | 'asiakastietolomake_versiot' (vanhan lisakentat)
export const haeKayntiVastauksilla = async (hoitokayntiId) => {
  if (!hoitokayntiId) return null

  const { data: kaynti, error: kayntiVirhe } = await supabase
    .from('hoitokaynnit')
    .select('id, vastaukset, tila, versio, otsikko, pvm, lomake_versio_id')
    .eq('id', hoitokayntiId)
    .maybeSingle()
  if (kayntiVirhe) {
    console.error('Käynnin haku epäonnistui:', kayntiVirhe)
    return null
  }
  if (!kaynti) return null

  const onUudessaFormaatissa = kaynti.vastaukset
    && typeof kaynti.vastaukset === 'object'
    && !Array.isArray(kaynti.vastaukset)
    && Object.keys(kaynti.vastaukset).length > 0

  if (onUudessaFormaatissa) {
    return {
      vastaukset: kaynti.vastaukset,
      tila:       kaynti.tila,
      versio:     kaynti.versio,
      otsikko:    kaynti.otsikko,
      pvm:        kaynti.pvm,
      lahde:      'hoitokaynnit',
    }
  }

  // Vanha formaatti TAI uusi luonnos jolla ei vielä vastauksia.
  // Yritä lukea linkitettyä A-lomakeversiota — vain lisakentat-jsonb
  // (joka on jo renderöijän vastaukset-formaatissa).
  let vanhatVastaukset = {}
  let lahde = 'hoitokaynnit'
  if (kaynti.lomake_versio_id) {
    const { data: versio } = await supabase
      .from('asiakastietolomake_versiot')
      .select('lisakentat')
      .eq('id', kaynti.lomake_versio_id)
      .maybeSingle()
    if (versio?.lisakentat && typeof versio.lisakentat === 'object') {
      vanhatVastaukset = versio.lisakentat
      if (Object.keys(vanhatVastaukset).length > 0) {
        lahde = 'asiakastietolomake_versiot'
      }
    }
  }

  return {
    vastaukset: vanhatVastaukset,
    tila:       kaynti.tila,
    versio:     kaynti.versio,
    otsikko:    kaynti.otsikko,
    pvm:        kaynti.pvm,
    lahde,
  }
}

// AB-T4c: lukitse käynti snapshotiksi — UPDATE tila='valmis' optimistisella
// lukolla. Auto-save:n viimeisin tallennus on jo mennyt läpi (UI suorittaa
// pendingit ennen lukitusta), tämä funktio vain vaihtaa tilan + inkrementoi
// version.
//
// Palauttaa: { virhe: null, versio } | { virhe: msg } | { ristiriita: true, ... }
export const lukitseKaynti = async (hoitokayntiId, odotettuVersio = null) => {
  if (!hoitokayntiId) return { virhe: 'Hoitokaynti-id puuttuu' }

  const muutokset = {
    tila:       'valmis',
    versio:     (odotettuVersio ?? 0) + 1,
    paivitetty: new Date().toISOString(),
  }

  let kysely = supabase
    .from('hoitokaynnit')
    .update(muutokset)
    .eq('id', hoitokayntiId)
  if (odotettuVersio !== null) kysely = kysely.eq('versio', odotettuVersio)

  const { data, error } = await kysely.select('id, versio')
  if (error) {
    console.error('Käynnin lukitus epäonnistui:', error)
    return { virhe: error.message }
  }
  if (odotettuVersio !== null && (!data || data.length === 0)) {
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

// AB-T4c: avaa lukittu käynti uudelleen muokattavaksi. Snapshot-mallin
// turvarajoite: jokainen avaus inkrementoi avattu_uudelleen_kerralla-laskuria
// ja appendaa avattu_uudelleen_kasittely-jsonbiin merkinnän { aikaleima,
// hoitaja_id, syy? }. Aiempi data säilyy.
//
// Käyttää ehdollista UPDATE:a (WHERE tila='valmis') jotta race condition jossa
// joku muu on jo avannut ei ylikirjoita lukijatietoja. Read-then-write -malli
// on ok lokille koska kaksi samanaikaista avausta on harvinainen tilanne.
export const avaaKayntiUudelleen = async (hoitokayntiId, syy = null) => {
  if (!hoitokayntiId) return { virhe: 'Hoitokaynti-id puuttuu' }

  const { data: { user }, error: userVirhe } = await supabase.auth.getUser()
  if (userVirhe || !user) return { virhe: 'Kirjautuminen vaaditaan' }

  // 1. Hae nykyinen loki + tila — varmista että käynti on todella lukittu
  const { data: kaynti, error: hakuVirhe } = await supabase
    .from('hoitokaynnit')
    .select('avattu_uudelleen_kerralla, avattu_uudelleen_kasittely, tila')
    .eq('id', hoitokayntiId)
    .maybeSingle()
  if (hakuVirhe) {
    console.error('Käynnin haku ennen avaamista epäonnistui:', hakuVirhe)
    return { virhe: hakuVirhe.message }
  }
  if (!kaynti) return { virhe: 'Käyntiä ei löytynyt' }
  if (kaynti.tila !== 'valmis') {
    return { virhe: 'Käynti ei ole lukittu (tila ei ole "valmis")' }
  }

  // 2. Rakenna uusi loki ja UPDATE ehdollisesti
  const aiempiLoki = Array.isArray(kaynti.avattu_uudelleen_kasittely)
    ? kaynti.avattu_uudelleen_kasittely
    : []
  const uusiLoki = [
    ...aiempiLoki,
    {
      aikaleima:  new Date().toISOString(),
      hoitaja_id: user.id,
      syy:        syy?.trim() || null,
    },
  ]
  const uusiLaskuri = (kaynti.avattu_uudelleen_kerralla ?? 0) + 1

  const { data, error: paivitysVirhe } = await supabase
    .from('hoitokaynnit')
    .update({
      tila:                       'luonnos',
      avattu_uudelleen_kerralla:  uusiLaskuri,
      avattu_uudelleen_kasittely: uusiLoki,
      paivitetty:                 new Date().toISOString(),
    })
    .eq('id', hoitokayntiId)
    .eq('tila', 'valmis')             // race-suojaus
    .select('id')
  if (paivitysVirhe) {
    console.error('Käynnin avaaminen epäonnistui:', paivitysVirhe)
    return { virhe: paivitysVirhe.message }
  }
  if (!data || data.length === 0) {
    // Joku muu on jo avannut käynnin samanaikaisesti — read-then-write race
    return { virhe: 'Joku muu on jo avannut käynnin' }
  }

  return { virhe: null, avattuKerralla: uusiLaskuri }
}

// KIIRE-FIX 6b: Hae monen asiakkaan käyntien päivämäärät suoraan
// hoitokaynnit-taulusta. Asiakasrekisterin käyntilaskenta luki aiemmin
// asiakastietolomake_versiot-taulusta (suljetut A-versiot), mutta
// ensimmäisen käynnin A-versio sulkeutuu vasta seuraavan käynnin
// alkaessa → käynnillinen asiakas näkyi käynnittömänä. Tämä funktio
// käyttää samaa lähdettä kuin haeViimeisinHoitokaynti ja KIIRE-FIX 6:n
// klikki-handler, jolloin napin näkyvyys ja klikkauksen polku ovat
// yhdenmukaiset.
//
// Suodatus: lomakepohja_versio_id IS NOT NULL — vain "ehjät" käynnit,
// joista löytyy lomakepohjan versio (ks. avaaOlemassaKaynti reuna-
// tapaukset vanhoille käynneille).
//
// Palauttaa: { asiakasId: [pvm, pvm, ...] } -mapin. Jokainen pvm on
// hoitokaynnit.pvm-ISO-merkkijono uusimmasta vanhimpaan. Asiakkaalle
// jolla ei ole ehjiä käyntejä palautuu tyhjä lista.
export const haeKayntienPaivamaaratHoitokaynneista = async (asiakasIdLista) => {
  const map = {}
  if (!asiakasIdLista || asiakasIdLista.length === 0) return map
  for (const id of asiakasIdLista) map[id] = []

  const { data, error } = await supabase
    .from('hoitokaynnit')
    .select('asiakas_id, pvm')
    .in('asiakas_id', asiakasIdLista)
    .not('lomakepohja_versio_id', 'is', null)
    .order('pvm', { ascending: false, nullsFirst: false })
  if (error) {
    console.error('Käyntien päivämäärien haku hoitokaynneista epäonnistui:', error)
    return map
  }

  for (const r of (data ?? [])) {
    if (!r.asiakas_id) continue
    if (!map[r.asiakas_id]) map[r.asiakas_id] = []
    map[r.asiakas_id].push(r.pvm)
  }
  return map
}

// KIIRE-FIX 6 (D-malli): Hae asiakkaan VIIMEISIN hoitokaynti (mikä tahansa tila).
// Käytetään Asiakasrekisterin pääpainikkeen polkuun jossa käynnillisille
// avataan viimeisin käynti muokkaustilassa. Jos viimeisimmästä puuttuu
// lomakepohja_versio_id (vanha käynti ennen Pala 2.24:ää) palautetaan
// kaynti=null jotta kutsuva pudottaa palveluvalinta + uusi käynti -polkuun.
export const haeViimeisinHoitokaynti = async (asiakasId) => {
  if (!asiakasId) return { kaynti: null, virhe: 'Asiakas-id puuttuu' }
  const { data, error } = await supabase
    .from('hoitokaynnit')
    .select('id, tila, lomakepohja_versio_id, pvm')
    .eq('asiakas_id', asiakasId)
    .order('pvm', { ascending: false, nullsFirst: false })
    .order('luotu', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { kaynti: null, virhe: error.message }
  if (!data) return { kaynti: null, virhe: null }
  if (!data.lomakepohja_versio_id) return { kaynti: null, virhe: null }
  return { kaynti: data, virhe: null }
}

// KIIRE-FIX 6 (D-malli): Lataa olemassa olevan hoitokäynnin tiedot
// LomakeRenderoijaa varten muokkaustilassa. Jos käynti on lukittu (tila='valmis')
// avataan se uudelleen ennen palautusta. Palauttaa snapshot-pohjan rakenteen +
// kenttäkirjaston tunnisteille + nykyiset vastaukset + tuoreen versionumeron
// optimistista lukkoa varten.
//
// Polku:
//   1. hoitokaynnit-rivi by id (vastaukset, lomakepohja_versio_id, versio, tila)
//   2. jos tila='valmis' → avaaKayntiUudelleen + hae päivitetty versio
//   3. lomakepohja_versiot.rakenne snapshot-id:llä (ei aktiivinen versio!)
//   4. kenttakirjasto rakenteen tunnisteille (sama logiikka kuin haeLomakepohja)
//
// Reuna-tapaukset palauttavat virheen — kutsuvan vastuulla näyttää käyttäjälle:
//   - käynti puuttuu, ei oikeutta lukea (RLS), lomakepohja_versio_id null
//   - lomakepohjan versio poistettu (FK SET NULL pohjasta)
//   - avaaKayntiUudelleen race "Joku muu on jo avannut käynnin"
export const avaaOlemassaKaynti = async (kayntiId) => {
  if (!kayntiId) return { virhe: 'Käynnin id puuttuu' }

  const { data: kaynti, error: kErr } = await supabase
    .from('hoitokaynnit')
    .select('id, tila, lomakepohja_versio_id, vastaukset, versio, asiakas_id')
    .eq('id', kayntiId)
    .maybeSingle()
  if (kErr || !kaynti) return { virhe: kErr?.message ?? 'Käyntiä ei löytynyt' }
  if (!kaynti.lomakepohja_versio_id) {
    return { virhe: 'Käynnistä puuttuu lomakepohjan versio (vanha käynti) — ei voi avata muokkaustilassa' }
  }

  let kaytettavaVersio = kaynti.versio
  if (kaynti.tila === 'valmis') {
    const tulos = await avaaKayntiUudelleen(kayntiId)
    if (tulos.virhe) return { virhe: `Käynnin avaaminen uudelleen: ${tulos.virhe}` }
    // avaaKayntiUudelleen kasvattaa versionumeroa yhdellä — hae tuore arvo
    // jotta auto-saven optimistinen lukko ei laukea ensimmäisellä tallennuksella.
    const { data: paivitetty } = await supabase
      .from('hoitokaynnit')
      .select('versio')
      .eq('id', kayntiId)
      .maybeSingle()
    if (paivitetty?.versio != null) kaytettavaVersio = paivitetty.versio
  }

  const { data: versio, error: vErr } = await supabase
    .from('lomakepohja_versiot')
    .select('rakenne')
    .eq('id', kaynti.lomakepohja_versio_id)
    .maybeSingle()
  if (vErr || !versio?.rakenne) return { virhe: 'Lomakepohjan version haku epäonnistui' }

  const tunnisteet = []
  for (const osio of (versio.rakenne?.osiot ?? [])) {
    for (const kf of (osio.kenttat ?? [])) {
      if (kf.kentta_id_tunniste) tunnisteet.push(kf.kentta_id_tunniste)
    }
  }
  let kentat = {}
  if (tunnisteet.length > 0) {
    const { data: kenttaRivit, error: kErr2 } = await supabase
      .from('kenttakirjasto')
      .select('id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset, kentan_versiot(versio, kaannokset, pysyva)')
      .in('kentta_id_tunniste', tunnisteet)
    if (kErr2) return { virhe: 'Kenttäkirjaston haku epäonnistui' }
    for (const k of (kenttaRivit ?? [])) {
      const v = (k.kentan_versiot ?? []).slice().sort((a, b) => b.versio - a.versio)[0]
      kentat[k.kentta_id_tunniste] = {
        id:         k.id,
        tunniste:   k.kentta_id_tunniste,
        tyyppi:     k.kenttatyyppi,
        validointi: k.validointi ?? {},
        oletukset:  k.oletukset ?? {},
        kaannokset: v?.kaannokset ?? {},
        pysyva:     v?.pysyva ?? false,
      }
    }
  }

  return {
    virhe: null,
    kaynti: {
      id:         kaynti.id,
      asiakasId:  kaynti.asiakas_id,
      versio:     kaytettavaVersio,
      vastaukset: kaynti.vastaukset ?? {},
    },
    valmiitTiedot: { rakenne: versio.rakenne, kentat },
  }
}
