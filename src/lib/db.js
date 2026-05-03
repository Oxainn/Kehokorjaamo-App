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
