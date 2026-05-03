// Kehokorjaamo-App — AI-analyysi löydöksistä
//
// Tämä moduuli sisältää funktiot AI-pohjaiseen löydösanalyysiin
// (Anthropic Claude Haiku) Edge Functionin kautta:
//   - kutsuAIAnalyysi: kutsuu ai-analyysi-loydoksista Edge Functionia,
//     ei tallenna automaattisesti
//   - haeAIKutsuKvoot: laskee hoitajan AI-kutsujen määrän viimeiseltä
//     tunnilta + päivältä (UI:n kvoot-laskuri)
//   - haeAIAnalyysi / tallennaAIAnalyysi: käyntikohtaisen analyysin
//     haku ja tallennus ai_ehdotukset-tauluun (yksi rivi per käynti+tyyppi)
//
// Funktiot re-exportoidaan db.js:n barrel-vientipisteen kautta, joten
// komponenttien import-polut (`import { ... } from '../lib/db'`) toimivat
// edelleen ilman muutoksia.

import { supabase } from '../supabase'

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
