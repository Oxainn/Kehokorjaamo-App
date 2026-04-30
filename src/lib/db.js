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

export const tallennaAsiakastietolomake = async (asiakasId, lomakeData, sairaudet = []) => {
  const { data: versio, error: versioError } = await supabase
    .from('asiakastietolomake_versiot')
    .insert({
      asiakas_id:             asiakasId,
      hoitoon_syy:            lomakeData.hoitoon_syy            || null,
      laakitys:               lomakeData.laakitys               || null,
      harrastukset:           lomakeData.harrastukset           || null,
      vammat_huomiot:         lomakeData.vammat_huomiot         || null,
      kipu_taso:              lomakeData.kipu_taso              ?? null,
      miten_loysi:            lomakeData.miten_loysi            || null,
      diagnosoidut_sairaudet: lomakeData.diagnosoidut_sairaudet || null,
      muokkaaja_id:           lomakeData.muokkaaja_id           ?? null,
      muokkaaja_rooli:        'hoitaja',
    })
    .select('id')
    .single()

  if (versioError) {
    console.error('Lomakeversion tallennus:', versioError)
    return { lomakeVersioId: null, error: versioError }
  }

  if (sairaudet.length > 0) {
    const rivit = sairaudet.map(s => ({
      lomake_versio_id:  versio.id,
      sairaus_tyyppi_id: s.sairaus_tyyppi_id,
      on_voimassa:       true,
      tarkenne:          s.tarkenne || null,
    }))
    const { error: sairaudetError } = await supabase
      .from('lomake_sairaudet')
      .insert(rivit)
    if (sairaudetError) {
      console.error('Sairauksien tallennus:', sairaudetError)
      return { lomakeVersioId: versio.id, error: sairaudetError }
    }
  }

  return { lomakeVersioId: versio.id, error: null }
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
// Asiakas: upsert (uusi tai päivitys olemassaolevaan, jos asiakasIdJosOlemassa annettu).
// Lomakeversio: aiemmat suljetaan (voimassa_asti=now()), uusi luodaan.
// Sairaudet: rivit lomake_sairaudet-tauluun.
// Lisäkentät: jsonb-sarakkeeseen asiakastietolomake_versiot.lisakentat.
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

  // 2. Sulje aiemmat lomakeversiot
  const { error: sulkuVirhe } = await supabase
    .from('asiakastietolomake_versiot')
    .update({ voimassa_asti: new Date().toISOString() })
    .eq('asiakas_id', asiakas.id)
    .is('voimassa_asti', null)

  if (sulkuVirhe) {
    console.error('Vanhojen versioiden sulku epäonnistui:', sulkuVirhe)
    return { virhe: `Vanhojen versioiden sulku: ${sulkuVirhe.message}`, asiakasId: asiakas.id }
  }

  // 3. Luo uusi lomakeversio
  const { data: versio, error: versioVirhe } = await supabase
    .from('asiakastietolomake_versiot')
    .insert({
      asiakas_id:      asiakas.id,
      ...jaettu.lomake,
      lisakentat:      jaettu.lisakentat,
      muokkaaja_id:    user.id,
      muokkaaja_rooli: muokkaajaRooli,
    })
    .select('id, versio_nro')
    .single()

  if (versioVirhe) {
    console.error('Lomakeversion tallennus epäonnistui:', versioVirhe)
    return { virhe: `Lomakeversion tallennus: ${versioVirhe.message}`, asiakasId: asiakas.id }
  }

  // 4. Sairaudet → lomake_sairaudet
  if (jaettu.sairaudet.length > 0) {
    const rivit = jaettu.sairaudet.map((sairausTyyppiId) => ({
      lomake_versio_id:  versio.id,
      sairaus_tyyppi_id: sairausTyyppiId,
      on_voimassa:       true,
    }))
    const { error: sairaudetVirhe } = await supabase.from('lomake_sairaudet').insert(rivit)
    if (sairaudetVirhe) {
      console.error('Sairauksien tallennus epäonnistui:', sairaudetVirhe)
      return {
        virhe:          `Sairauksien tallennus: ${sairaudetVirhe.message}`,
        asiakasId:      asiakas.id,
        lomakeVersioId: versio.id,
      }
    }
  }

  return {
    asiakasId:      asiakas.id,
    lomakeVersioId: versio.id,
    versioNro:      versio.versio_nro,
    virhe:          null,
  }
}
