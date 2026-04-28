const johdaKontraindikaatiot = (sairaudet) => {
  const tulos = {}
  for (const s of sairaudet) {
    if (s.kontraindikaatio === true || s.sairaus_tyyppi?.kontraindikaatio === true) {
      const koodi = s.koodi ?? s.sairaus_tyyppi?.koodi
      if (koodi) {
        tulos[koodi] = {
          on: s.on_voimassa ?? true,
          tarkenne: s.tarkenne ?? '',
        }
      }
    }
  }
  return tulos
}

export const normalisoiAsiakas = (a) => {
  if (!a) return null

  return {
    ...a,
    supabase_id:            a.id ?? a.supabase_id,
    harrastukset:           a.harrastukset           ?? '',
    hoitoon_syy:            a.hoitoon_syy            ?? '',
    laakitys:               a.laakitys               ?? '',
    miten_loysi:            a.miten_loysi            ?? '',
    diagnosoidut_sairaudet: a.diagnosoidut_sairaudet ?? '',
    vammat_huomiot:         a.vammat_huomiot         ?? '',
    kipu_taso:              a.kipu_taso              ?? null,
    kehonkartta_kuva_url:   a.kehonkartta_kuva_url   ?? null,
    sairaudet:              a.sairaudet              ?? [],
    kontraindikaatiot:      johdaKontraindikaatiot(a.sairaudet ?? []),
    merkinnät:              a.merkinnät              ?? {},
    vastauksia:             a.vastauksia             ?? {},
    havainnot:              a.havainnot              ?? {},
    nimi:                   a.nimi                   ?? '',
    sahkoposti:             a.sahkoposti             ?? '',
    puhelin:                a.puhelin                ?? '',
    lahiosoite:             a.lahiosoite             ?? '',
    postinumero:            a.postinumero            ?? '',
    postitoimipaikka:       a.postitoimipaikka       ?? '',
    ammatti:                a.ammatti                ?? '',
  }
}
