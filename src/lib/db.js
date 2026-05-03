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

// Asiakas-pohjaiset funktiot omassa moduulissa — re-exportoidaan tästä
// barrel-vientipisteestä jotta komponenttien import-polut säilyvät.
export * from './db/asiakkaat'
export * from './db/kaynnit'
export * from './db/lomake'
export * from './db/itsehoito'
export * from './db/ai'

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

// ─────────────────────────────────────────────────────────────────────────
// KA1 — Asentokuvat (4 per käynti: edesta/takaa/vasen/oikea)
// ─────────────────────────────────────────────────────────────────────────

export const haeAsentokuvat = async (hoitokayntiId) => {
  if (!hoitokayntiId) return []
  const { data, error } = await supabase
    .from('asentokuvat')
    .select('id, nakokulma, kuva_data, keypointit, kulmat, luotu')
    .eq('hoitokaynti_id', hoitokayntiId)
  if (error) {
    console.error('Asentokuvien haku epäonnistui:', error)
    return []
  }
  return data ?? []
}

// Tallenna tai päivitä yhden näkökulman kuva. Upsert hoitokaynti+nakokulma-
// uniikilla rajoitteella → vanha vaihtuu uuteen.
export const tallennaAsentokuva = async ({ hoitokayntiId, asiakasId, nakokulma, kuvaData }) => {
  if (!hoitokayntiId || !asiakasId || !nakokulma || !kuvaData) {
    return { virhe: 'Pakollisia tietoja puuttuu' }
  }
  const { data: { user }, error: userVirhe } = await supabase.auth.getUser()
  if (userVirhe || !user) return { virhe: 'Kirjautuminen vaaditaan' }

  const { data, error } = await supabase
    .from('asentokuvat')
    .upsert({
      hoitokaynti_id: hoitokayntiId,
      asiakas_id:     asiakasId,
      hoitaja_id:     user.id,
      nakokulma,
      kuva_data:      kuvaData,
    }, { onConflict: 'hoitokaynti_id,nakokulma' })
    .select('id, nakokulma, kuva_data, luotu')
    .single()
  if (error) {
    console.error('Asentokuvan tallennus epäonnistui:', error)
    return { virhe: error.message }
  }
  return { kuva: data, virhe: null }
}

export const poistaAsentokuva = async (kuvaId) => {
  if (!kuvaId) return { virhe: 'Kuva-id puuttuu' }
  const { error } = await supabase
    .from('asentokuvat')
    .delete()
    .eq('id', kuvaId)
  if (error) return { virhe: error.message }
  return { virhe: null }
}

// KA2 — päivitä yksittäisen asentokuvan keypointit (pose-detectionin tulos).
// keypointit-jsonb: [{ name, x, y, score }]
export const paivitaAsentokuvanKeypointit = async (kuvaId, keypointit) => {
  if (!kuvaId) return { virhe: 'Kuva-id puuttuu' }
  const { error } = await supabase
    .from('asentokuvat')
    .update({ keypointit })
    .eq('id', kuvaId)
  if (error) {
    console.error('Keypointtien tallennus epäonnistui:', error)
    return { virhe: error.message }
  }
  return { virhe: null }
}

// KA3 — päivitä asentokuvan kulmat (lasketut anatomiset kulmat).
// kulmat-jsonb: { olkapaiden_korkeusero_cm: 1.5, ... }
export const paivitaAsentokuvanKulmat = async (kuvaId, kulmat) => {
  if (!kuvaId) return { virhe: 'Kuva-id puuttuu' }
  const { error } = await supabase
    .from('asentokuvat')
    .update({ kulmat })
    .eq('id', kuvaId)
  if (error) {
    console.error('Kulmien tallennus epäonnistui:', error)
    return { virhe: error.message }
  }
  return { virhe: null }
}

// KA4 — päivitä keypointit JA kulmat yhdessä transaktiossa (manuaalisen
// korjauksen jälkeen). Vältetään race condition jos käyttäjä raahaa nopeasti.
export const paivitaKeypointitJaKulmat = async (kuvaId, keypointit, kulmat) => {
  if (!kuvaId) return { virhe: 'Kuva-id puuttuu' }
  const { error } = await supabase
    .from('asentokuvat')
    .update({ keypointit, kulmat })
    .eq('id', kuvaId)
  if (error) {
    console.error('Keypointtien+kulmien tallennus epäonnistui:', error)
    return { virhe: error.message }
  }
  return { virhe: null }
}

// KA6 — hae asiakkaan kaikki asentokuvat ryhmiteltynä käyntien mukaan.
// Käytetään vertailuun (Vertailu-välilehti) ja aikajanaan.
//
// Palautusmuoto: array of { hoitokayntiId, otsikko, luotu, paivitetty,
//                            kaynninTila, kuvat: { edesta?, takaa?, vasen?, oikea? } }
// Sortataan uusin ensin.
export const haeAsiakkaanAsentokuvaHistoria = async (asiakasId) => {
  if (!asiakasId) return []
  const { data, error } = await supabase
    .from('asentokuvat')
    .select('id, hoitokaynti_id, nakokulma, kuva_data, keypointit, kulmat, luotu, hoitokaynnit:hoitokaynti_id(id, otsikko, luotu, paivitetty, tila)')
    .eq('asiakas_id', asiakasId)
    .order('luotu', { ascending: false })
  if (error) {
    console.error('Asentokuvahistorian haku epäonnistui:', error)
    return []
  }
  // Ryhmittele käynneittäin (säilyttäen järjestys: uusin ensin)
  const ryhmat = new Map()
  for (const r of data ?? []) {
    const kid = r.hoitokaynti_id
    if (!kid) continue
    let ryhma = ryhmat.get(kid)
    if (!ryhma) {
      const k = r.hoitokaynnit ?? {}
      ryhma = {
        hoitokayntiId: kid,
        otsikko:       k.otsikko ?? null,
        luotu:         k.luotu ?? r.luotu,
        paivitetty:    k.paivitetty ?? null,
        kaynninTila:   k.tila ?? null,
        kuvat:         {},
      }
      ryhmat.set(kid, ryhma)
    }
    // KA4-formaatti: keypointit voi olla {ai,nykyiset} tai array
    const raw = r.keypointit
    let nykyiset = null
    let aiKp = null
    if (Array.isArray(raw)) {
      nykyiset = raw
      aiKp = raw
    } else if (raw && typeof raw === 'object') {
      nykyiset = raw.nykyiset ?? raw.ai ?? null
      aiKp = raw.ai ?? raw.nykyiset ?? null
    }
    ryhma.kuvat[r.nakokulma] = {
      id:            r.id,
      kuva_data:     r.kuva_data,
      keypointit:    nykyiset,
      ai_keypointit: aiKp,
      kulmat:        r.kulmat ?? null,
      luotu:         r.luotu,
    }
  }
  // Järjestä uusin ensin (luotu desc)
  return Array.from(ryhmat.values()).sort((a, b) => {
    const ta = new Date(a.luotu).getTime()
    const tb = new Date(b.luotu).getTime()
    return tb - ta
  })
}
