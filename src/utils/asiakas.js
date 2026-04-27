export const normalisoiAsiakas = (a) => ({
  ...a,
  supabase_id:       a.id ?? a.supabase_id,
  kontraindikaatiot: a.kontraindikaatiot ?? {},
  merkinnät:         a.merkinnät         ?? {},
  vastauksia:        a.vastauksia        ?? {},
  havainnot:         a.havainnot         ?? {},
})
