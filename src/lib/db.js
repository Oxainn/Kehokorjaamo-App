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

// Asiakas-pohjaiset funktiot omassa moduulissa — re-exportoidaan tästä
// barrel-vientipisteestä jotta komponenttien import-polut säilyvät.
export * from './db/asiakkaat'
export * from './db/kaynnit'

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
