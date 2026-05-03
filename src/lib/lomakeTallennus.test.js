import { describe, it, expect } from 'vitest'
import { jaaVastaukset } from './lomakeTallennus'

describe('jaaVastaukset', () => {
  it('tyhjä syöte → palauttaa tyhjät rakenteet', () => {
    expect(jaaVastaukset({})).toEqual({
      asiakas:    {},
      lomake:     {},
      sairaudet:  [],
      lisakentat: {},
    })
  })

  it('null/undefined syöte → palauttaa tyhjät rakenteet (ei kaadu)', () => {
    const tyhjat = { asiakas: {}, lomake: {}, sairaudet: [], lisakentat: {} }
    // Funktio käyttää `vastaukset ?? {}` → null ja undefined kohtaavat saman polun
    expect(jaaVastaukset(null)).toEqual(tyhjat)
    expect(jaaVastaukset(undefined)).toEqual(tyhjat)
  })

  it('asiakas-sarakkeisiin menevät kentät päätyvät asiakas-objektiin oikealla nimellä', () => {
    const tulos = jaaVastaukset({
      sahkoposti:  'a@b.fi',
      puhelin:     '+35840',
      katuosoite:  'Tie 1',
      kaupunki:    'Espoo',
      syntymaaika: '1980-05-12',
      ammatti:     'hoitaja',
      pituus:      168,
      paino:       65,
    })

    // Uudelleennimeämiset (renderöijän tunniste → DB-sarake):
    //   katuosoite  → lahiosoite
    //   kaupunki    → postitoimipaikka
    expect(tulos.asiakas).toEqual({
      sahkoposti:       'a@b.fi',
      puhelin:          '+35840',
      lahiosoite:       'Tie 1',
      postitoimipaikka: 'Espoo',
      syntymaaika:      '1980-05-12',
      ammatti:          'hoitaja',
      pituus:           168,
      paino:            65,
    })

    // Ei vahingossa muihin lokeroihin
    expect(tulos.lomake).toEqual({})
    expect(tulos.lisakentat).toEqual({})
    expect(tulos.sairaudet).toEqual([])
  })

  it('lomake-sarakkeisiin menevät kentät päätyvät lomake-objektiin oikealla nimellä', () => {
    const tulos = jaaVastaukset({
      hoitoon_tulon_kuvaus: 'kipu niskassa',
      kipuluku:             7,
      laakkeet:             'Burana',
      diagnoosit:           'verenpainetauti',
      vammat_huomiot:       'jalkaleikkaus 2020',
      harrastukset:         'kävely',
    })

    // Uudelleennimeämiset:
    //   hoitoon_tulon_kuvaus → hoitoon_syy
    //   kipuluku             → kipu_taso
    //   laakkeet             → laakitys
    //   diagnoosit           → diagnosoidut_sairaudet
    expect(tulos.lomake).toEqual({
      hoitoon_syy:            'kipu niskassa',
      kipu_taso:              7,
      laakitys:               'Burana',
      diagnosoidut_sairaudet: 'verenpainetauti',
      vammat_huomiot:         'jalkaleikkaus 2020',
      harrastukset:           'kävely',
    })
    expect(tulos.asiakas).toEqual({})
    expect(tulos.lisakentat).toEqual({})
  })

  it('etunimi + sukunimi → yhdistetään asiakas.nimi-kenttään, alkuperäiset kentät poistetaan', () => {
    const tulos = jaaVastaukset({ etunimi: 'Sara', sukunimi: 'Sieppi' })
    expect(tulos.asiakas).toEqual({ nimi: 'Sara Sieppi' })
    // delete-operaatiot rivit 98-99 poistavat etunimi/sukunimi-avaimet
    expect(tulos.asiakas).not.toHaveProperty('etunimi')
    expect(tulos.asiakas).not.toHaveProperty('sukunimi')
  })

  it('sairaudet-rasti tallentuu sairaudet-listaan sellaisenaan', () => {
    const tulos = jaaVastaukset({ sairaudet: [1, 2, 3] })
    expect(tulos.sairaudet).toEqual([1, 2, 3])
    // Ei mene mihinkään muuhun rakenteeseen
    expect(tulos.asiakas).toEqual({})
    expect(tulos.lomake).toEqual({})
    expect(tulos.lisakentat).toEqual({})
  })

  it('tuntemattomat kentät päätyvät lisakentat-objektiin', () => {
    const tulos = jaaVastaukset({
      jokuOmaKentta: 'arvo',
      toinenKentta:  42,
      kolmas:        true,
    })
    expect(tulos.lisakentat).toEqual({
      jokuOmaKentta: 'arvo',
      toinenKentta:  42,
      kolmas:        true,
    })
    expect(tulos.asiakas).toEqual({})
    expect(tulos.lomake).toEqual({})
  })

  it('suostumukset (gdpr_hyvaksytty, lupa_luovutukseen) → asiakas-objektin boolean-sarakkeisiin', () => {
    const tulos = jaaVastaukset({
      gdpr_hyvaksytty:   true,
      lupa_luovutukseen: false,
    })
    // Uudelleennimeämiset:
    //   gdpr_hyvaksytty   → suostumus_tietojen_sailytys
    //   lupa_luovutukseen → suostumus_tietojen_luovutus
    //
    // Koodi käyttää `arvo === true` -tarkistusta → vain literaali true tuottaa
    // true:n. Esim. 'true', 1, 'on' → false. Tämä on tahallinen strict-tarkistus.
    expect(tulos.asiakas).toEqual({
      suostumus_tietojen_sailytys: true,
      suostumus_tietojen_luovutus: false,
    })
  })
})
