// Kehokorjaamo-App — Palvelut + lomakepohja-linkitys (palvelu↔lomakepohja 1:N)
//
// Tämä moduuli sisältää palvelut-taulun CRUD:in ja palvelujen
// linkityksen lomakepohjiin (yksi palvelu → yksi pohja, sama pohja
// voi olla monessa palvelussa). Pohjan id on palvelut.lomakepohja_id.
//
// Funktiot re-exportoidaan db.js:n barrel-vientipisteen kautta, joten
// komponenttien import-polut (`import { ... } from '../lib/db'`) toimivat
// edelleen ilman muutoksia.

import { supabase } from '../supabase'

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

// Pala 2.16: siirrä palvelu ylös/alas vaihtamalla jarjestys-arvot viereisen
// kanssa. suunta: -1 (ylös) tai +1 (alas). Jos jo reunassa, palauttaa onnistuneesti
// ilman muutoksia.
export const siirraPalvelu = async (palveluId, suunta) => {
  if (suunta !== -1 && suunta !== 1) return { virhe: 'Suunta pitää olla -1 tai 1' }
  const { data: { user }, error: userVirhe } = await supabase.auth.getUser()
  if (userVirhe || !user) return { virhe: 'Kirjautuminen vaaditaan' }

  const { data: kaikki, error: hakuVirhe } = await supabase
    .from('palvelut')
    .select('id, jarjestys')
    .eq('hoitaja_id', user.id)
    .order('jarjestys', { ascending: true })
    .order('nimi', { ascending: true })
  if (hakuVirhe) return { virhe: hakuVirhe.message }

  const idx = (kaikki ?? []).findIndex((p) => p.id === palveluId)
  if (idx < 0) return { virhe: 'Palvelua ei löytynyt' }

  const uusiIdx = idx + suunta
  if (uusiIdx < 0 || uusiIdx >= kaikki.length) return { virhe: null }  // reunassa, ei muutosta

  const nykyinen = kaikki[idx]
  const naapuri  = kaikki[uusiIdx]

  // Swap jarjestys-arvot kahdella UPDATE:lla. Ei UNIQUE-ehtoa joten
  // välitilanne (molemmilla sama arvo) on hyväksyttävä.
  const { error: e1 } = await supabase.from('palvelut').update({ jarjestys: naapuri.jarjestys }).eq('id', nykyinen.id)
  if (e1) return { virhe: e1.message }
  const { error: e2 } = await supabase.from('palvelut').update({ jarjestys: nykyinen.jarjestys }).eq('id', naapuri.id)
  if (e2) return { virhe: e2.message }

  return { virhe: null }
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
