import { supabase } from './supabase'

export const tallennaAsiakas = async (data) => {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: asiakas, error } = await supabase
    .from('asiakkaat')
    .upsert({
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
    })
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

export const haeSairausTyypit = async () => {
  const { data, error } = await supabase
    .from('sairaus_tyypit')
    .select('id, koodi, nimi, kontraindikaatio')
    .order('nimi')
  if (error) {
    console.error('Sairaustyyppienhaku:', error)
    return []
  }
  return data ?? []
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
      ),
      lomake_versio:asiakastietolomake_versiot!inner (
        asiakas_id,
        voimassa_asti
      )
    `)
    .eq('lomake_versio.asiakas_id', asiakasId)
    .is('lomake_versio.voimassa_asti', null)
    .eq('on_voimassa', true)

  if (error) {
    console.error('Sairauksien haku epäonnistui:', error)
    return []
  }
  return data ?? []
}
