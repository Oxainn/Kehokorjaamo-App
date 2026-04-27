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
  hoitosuunnitelma, kuvaAnalyysit
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

export const tallennaUusiAsiakas = async (data) => {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('uudet_asiakkaat')
    .insert({
      hoitaja_id:  user.id,
      nimi:        data.nimi,
      sahkoposti:  data.sahkoposti,
      puhelin:     data.puhelin,
      palvelu:     data.palvelu ?? 'Kalevalainen jäsenkorjaus',
      hoitoon_syy: data.hoitoon_syy,
      kipuaste:    data.kipuaste ?? 0,
    })

  if (error) {
    console.error('Tallennus epäonnistui:', error)
    return false
  }
  return true
}

export const haeUudetAsiakkaat = async () => {
  const { data, error } = await supabase
    .from('uudet_asiakkaat')
    .select('*')
    .eq('kasitelty', false)
    .order('luotu', { ascending: false })

  if (error) return []
  return data
}

export const merkitseKasitellyksi = async (id) => {
  await supabase
    .from('uudet_asiakkaat')
    .update({ kasitelty: true })
    .eq('id', id)
}
