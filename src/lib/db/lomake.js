// Kehokorjaamo-App — A-lomake-versiot, sairaudet, lomakepohjat, kenttäkirjasto
//
// Tämä moduuli sisältää:
//   - asiakastietolomake_versiot (A-lomake) -taulun haku, sisällön päivitys
//   - lomake_sairaudet-taulun käsittely (rastitukset)
//   - sairaus_tyypit-referenssin haku (cache mukana)
//   - lomakepohja + kenttäkirjasto -järjestelmä (lomake-editorin tausta)
//   - tallennaRenderoijastaLomake — koko lomake-tallennusketju asiakkaaksi
//     + lomakeversioksi + sairauksiksi (käyttää jaaVastaukset-apuria
//     lomakeTallennus.js:stä)
//
// Funktiot re-exportoidaan db.js:n barrel-vientipisteen kautta, joten
// komponenttien import-polut (`import { ... } from '../lib/db'`) toimivat
// edelleen ilman muutoksia.

import { supabase } from '../supabase'
import { jaaVastaukset } from '../lomakeTallennus'

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
