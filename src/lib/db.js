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
