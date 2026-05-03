// Kehokorjaamo-App — itsehoito-kirjasto + käyntikohtaiset valinnat
//
// Tämä moduuli sisältää:
//   - itsehoito_kirjasto-taulun haku, luonti ja päivitys (Pala B5,
//     hoitajan ylläpitämä yleisten harjoitusten kokoelma)
//   - itsehoito_kaynnin_valinnat-taulun haku ja tallennus (Pala B6,
//     hoitokerralla valitut harjoitukset)
//
// Funktiot re-exportoidaan db.js:n barrel-vientipisteen kautta, joten
// komponenttien import-polut (`import { ... } from '../lib/db'`) toimivat
// edelleen ilman muutoksia.

import { supabase } from '../supabase'

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
