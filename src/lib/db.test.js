import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Yhteinen Supabase-mock kaikille db.js-funktioille.
// `from(taulu)` palauttaa ketjun, joka tukee Supabase JS-clientin
// fluent-APIa: select/insert/update/upsert/eq/is/neq/order/limit/single/
// maybeSingle. Ketju on myös thenable, joten `await chain.update().eq()`
// toimii ilman erillistä terminal-metodia.
//
// Per-taulu jonot:
//   tulosJonot[taulu]   = [{data,error}, ...]  ← shiftattu jokaiselle from-kutsulle
//   upsertJonot[taulu]  = [rivi, ...]          ← rivit jotka upsert sai
//   insertJonot[taulu]  = [rivi, ...]          ← rivit jotka insert sai
//   updateJonot[taulu]  = [rivi, ...]          ← rivit jotka update sai
const apurit = vi.hoisted(() => {
  const tila = {
    getUserTulos: { data: { user: { id: 'mock-uid' } } },
    tulosJonot: {},
    upsertJonot: {},
    insertJonot: {},
    updateJonot: {},
  }

  const otaTulos = (taulu) => {
    const jono = tila.tulosJonot[taulu]
    if (!jono || jono.length === 0) return { data: null, error: null }
    return jono.shift()
  }

  const lisaaJonoon = (sailo, taulu, arvo) => {
    if (!sailo[taulu]) sailo[taulu] = []
    sailo[taulu].push(arvo)
  }

  const teeKetju = (taulu) => {
    let ratkaistu = null
    const ratkaise = () => {
      if (!ratkaistu) ratkaistu = Promise.resolve(otaTulos(taulu))
      return ratkaistu
    }
    const ketju = {}
    ketju.select      = vi.fn(() => ketju)
    ketju.insert      = vi.fn((rivi) => { lisaaJonoon(tila.insertJonot, taulu, rivi); return ketju })
    ketju.update      = vi.fn((rivi) => { lisaaJonoon(tila.updateJonot, taulu, rivi); return ketju })
    ketju.upsert      = vi.fn((rivi) => { lisaaJonoon(tila.upsertJonot, taulu, rivi); return ketju })
    ketju.eq          = vi.fn(() => ketju)
    ketju.is          = vi.fn(() => ketju)
    ketju.neq         = vi.fn(() => ketju)
    ketju.order       = vi.fn(() => ketju)
    ketju.limit       = vi.fn(() => ketju)
    ketju.single      = vi.fn(() => ratkaise())
    ketju.maybeSingle = vi.fn(() => ratkaise())
    ketju.then        = (resolve, reject) => ratkaise().then(resolve, reject)
    return ketju
  }

  const fromVakooja    = vi.fn((taulu) => teeKetju(taulu))
  const getUserVakooja = vi.fn(() => Promise.resolve(tila.getUserTulos))

  const lisaaTulos = (taulu, tulos) => {
    if (!tila.tulosJonot[taulu]) tila.tulosJonot[taulu] = []
    tila.tulosJonot[taulu].push(tulos)
  }

  const nollaa = () => {
    tila.tulosJonot   = {}
    tila.upsertJonot  = {}
    tila.insertJonot  = {}
    tila.updateJonot  = {}
    tila.getUserTulos = { data: { user: { id: 'mock-uid' } } }
  }

  return { tila, fromVakooja, getUserVakooja, lisaaTulos, nollaa }
})

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: apurit.getUserVakooja },
    from: apurit.fromVakooja,
  },
}))

vi.mock('./lomakeTallennus', () => ({
  jaaVastaukset: vi.fn(),
  kokoaVastaukset: vi.fn(),
}))

import { tallennaAsiakas, aloitaUusiKaynti } from './db'

describe('tallennaAsiakas', () => {
  beforeEach(() => {
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.nollaa()
  })

  it('tallentaa asiakkaan onnistuneesti — palauttaa asiakas-objektin', async () => {
    apurit.lisaaTulos('asiakkaat', {
      data: { id: 'uusi-id', nimi: 'Maija Meikäläinen' },
      error: null,
    })

    const tulos = await tallennaAsiakas({
      nimi: 'Maija Meikäläinen',
      sahkoposti: 'maija@example.com',
      puhelin: '040 1234567',
      syntymaaika: '1980-05-12',
      pituus: 168,
      paino: 65,
    })

    expect(tulos).toEqual({ id: 'uusi-id', nimi: 'Maija Meikäläinen' })
    expect(apurit.fromVakooja).toHaveBeenCalledWith('asiakkaat')
    expect(apurit.tila.upsertJonot.asiakkaat).toHaveLength(1)

    const lahetettyRivi = apurit.tila.upsertJonot.asiakkaat[0]
    expect(lahetettyRivi).toMatchObject({
      hoitaja_id: 'mock-uid',
      nimi: 'Maija Meikäläinen',
      sahkoposti: 'maija@example.com',
      puhelin: '040 1234567',
      syntymaaika: '1980-05-12',
      pituus: 168,
      paino: 65,
    })
    // id-kenttää ei lisätä jos sitä ei syötteessä ollut (uusi asiakas)
    expect(lahetettyRivi).not.toHaveProperty('id')
  })

  it('virhetilanteessa palauttaa null ja kirjaa virheen konsoliin', async () => {
    apurit.lisaaTulos('asiakkaat', {
      data: null,
      error: { message: 'tietokantavirhe', code: '23505' },
    })
    const errorVakooja = vi.spyOn(console, 'error').mockImplementation(() => {})

    const tulos = await tallennaAsiakas({
      nimi: 'Virhe Testi',
      sahkoposti: 'virhe@example.com',
    })

    expect(tulos).toBeNull()
    expect(errorVakooja).toHaveBeenCalledWith(
      'Tallennus epäonnistui:',
      expect.objectContaining({ message: 'tietokantavirhe' })
    )

    errorVakooja.mockRestore()
  })

  it('tyhjät syntymaaika/pituus/paino tallennetaan null:na (`|| null` -käsittely, db.js rivit 26,33,34)', async () => {
    apurit.lisaaTulos('asiakkaat', {
      data: { id: 'jokin' },
      error: null,
    })

    await tallennaAsiakas({
      nimi: 'Tyhjä Testi',
      sahkoposti: 'tyhja@example.com',
      syntymaaika: '',
      pituus: '',
      paino: '',
    })

    const lahetettyRivi = apurit.tila.upsertJonot.asiakkaat[0]
    // db.js käyttää `data.kentta || null` → tyhjä merkkijono muuttuu null:ksi.
    // Tämä testi lukitsee nykyisen käyttäytymisen R1-T3-refaktoroinnin ajaksi.
    expect(lahetettyRivi.syntymaaika).toBeNull()
    expect(lahetettyRivi.pituus).toBeNull()
    expect(lahetettyRivi.paino).toBeNull()
  })

  it('jos syötteessä on id, se välitetään upsert-kutsuun (päivitys vs. uusi)', async () => {
    apurit.lisaaTulos('asiakkaat', {
      data: { id: 'olemassa-oleva-id' },
      error: null,
    })

    await tallennaAsiakas({
      id: 'olemassa-oleva-id',
      nimi: 'Päivitettävä',
      sahkoposti: 'paiv@example.com',
    })

    const lahetettyRivi = apurit.tila.upsertJonot.asiakkaat[0]
    expect(lahetettyRivi.id).toBe('olemassa-oleva-id')
  })
})

describe('aloitaUusiKaynti', () => {
  let warnVakooja
  let errorVakooja

  beforeEach(() => {
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.nollaa()
    // Vaiennetaan console.warn/error testilokeissa — koodi kirjaa joitakin
    // virhetilanteita normaalisti.
    warnVakooja  = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorVakooja = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    warnVakooja.mockRestore()
    errorVakooja.mockRestore()
  })

  it('palauttaa virheen jos asiakas-id puuttuu', async () => {
    expect(await aloitaUusiKaynti(null)).toEqual({ virhe: 'Asiakas-id puuttuu' })
    // Ei DB-kutsuja tehty
    expect(apurit.fromVakooja).not.toHaveBeenCalled()
    expect(apurit.getUserVakooja).not.toHaveBeenCalled()
  })

  it('palauttaa virheen jos käyttäjä ei ole kirjautunut', async () => {
    apurit.tila.getUserTulos = {
      data: { user: null },
      error: { message: 'session expired' },
    }
    expect(await aloitaUusiKaynti('asiakas-1')).toEqual({ virhe: 'Kirjautuminen vaaditaan' })
    // Ei DB-kutsuja vaikka auth tarkistettiin
    expect(apurit.fromVakooja).not.toHaveBeenCalled()
  })

  it('happy path — avoin A-versio + tyhjä B-lomake → palauttaa molemmat id:t', async () => {
    // 1. Hae avoin versio (select.eq.is.order.limit.maybeSingle)
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: {
        id: 'avoin-versio-id',
        hoitoon_syy: 'kipu niskassa',
        kipu_taso: 5,
        laakitys: 'ibu',
        diagnosoidut_sairaudet: 'ei',
        vammat_huomiot: '',
        harrastukset: 'kävely',
        lisakentat: { omaKentta: 'arvo' },
      },
      error: null,
    })
    // 2. Sulje vanha versio (update.eq → await)
    apurit.lisaaTulos('asiakastietolomake_versiot', { error: null })
    // 3. Hae sairaudet vanhasta versiosta (select.eq → await)
    apurit.lisaaTulos('lomake_sairaudet', {
      data: [
        { sairaus_tyyppi_id: 'sairaus-1', on_voimassa: true,  tarkenne: null },
        { sairaus_tyyppi_id: 'sairaus-2', on_voimassa: false, tarkenne: 'ehkä' },
      ],
      error: null,
    })
    // 4. Luo uusi versio (insert.select.single)
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { id: 'uusi-versio-id' },
      error: null,
    })
    // 5. Kopioi sairaudet (insert → await)
    apurit.lisaaTulos('lomake_sairaudet', { error: null })
    // 6. Hae tyhjä B-lomake (select.eq.eq.order.limit.maybeSingle)
    apurit.lisaaTulos('hoitokaynnit', {
      data: { id: 'tyhja-b-id' },
      error: null,
    })
    // 7. Päivitä tyhjä B-lomake luonnos-tilaan (update.eq → await)
    apurit.lisaaTulos('hoitokaynnit', { error: null })

    const tulos = await aloitaUusiKaynti('asiakas-1')

    expect(tulos).toEqual({
      lomakeVersioId: 'uusi-versio-id',
      hoitokayntiId:  'tyhja-b-id',
      virhe:          null,
    })
    // Sairaudet kopioitiin uuteen versioon — kaksi sairautta
    expect(apurit.tila.insertJonot.lomake_sairaudet).toHaveLength(1)
    expect(apurit.tila.insertJonot.lomake_sairaudet[0]).toHaveLength(2)
    expect(apurit.tila.insertJonot.lomake_sairaudet[0][0]).toMatchObject({
      lomake_versio_id:  'uusi-versio-id',
      sairaus_tyyppi_id: 'sairaus-1',
      on_voimassa:       true,
    })
  })

  it('happy path — avoin A-versio + EI tyhjää B-lomaketta → luo uuden B:n', async () => {
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { id: 'avoin-id', hoitoon_syy: '', lisakentat: null },
      error: null,
    })
    apurit.lisaaTulos('asiakastietolomake_versiot', { error: null }) // sulku
    apurit.lisaaTulos('lomake_sairaudet', { data: [], error: null }) // ei sairauksia
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { id: 'uusi-versio-id' },
      error: null,
    })
    // Sairauksien insertiä EI tule koska lista oli tyhjä
    apurit.lisaaTulos('hoitokaynnit', { data: null, error: null }) // ei tyhjää B
    apurit.lisaaTulos('hoitokaynnit', {
      data: { id: 'uusi-b-id' },
      error: null,
    })

    const tulos = await aloitaUusiKaynti('asiakas-1')

    expect(tulos).toEqual({
      lomakeVersioId: 'uusi-versio-id',
      hoitokayntiId:  'uusi-b-id',
      virhe:          null,
    })
    // Tarkista että uusi B-lomake luotiin oikealla A-versio-id:llä (avoin.id, ei uusi)
    expect(apurit.tila.insertJonot.hoitokaynnit).toHaveLength(1)
    expect(apurit.tila.insertJonot.hoitokaynnit[0]).toMatchObject({
      asiakas_id:       'asiakas-1',
      hoitaja_id:       'mock-uid',
      lomake_versio_id: 'avoin-id', // snapshot juuri suljetusta versiosta
      tila:             'luonnos',
    })
  })

  it('ei avointa A-versiota — luo tyhjän ja palauttaa pelkän lomakeVersioId:n', async () => {
    // Avoin haku ei löydä mitään
    apurit.lisaaTulos('asiakastietolomake_versiot', { data: null, error: null })
    // Tyhjän version insert onnistuu
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { id: 'tyhja-versio-id' },
      error: null,
    })

    const tulos = await aloitaUusiKaynti('asiakas-1')

    expect(tulos).toEqual({
      lomakeVersioId: 'tyhja-versio-id',
      virhe:          null,
    })
    // Ei hoitokayntiId-kenttää — reunatapaus palauttaa vain version
    expect(tulos.hoitokayntiId).toBeUndefined()

    const insertRivi = apurit.tila.insertJonot.asiakastietolomake_versiot[0]
    expect(insertRivi).toEqual({
      asiakas_id:      'asiakas-1',
      muokkaaja_id:    'mock-uid',
      muokkaaja_rooli: 'hoitaja',
    })
    // Hoitokäyntiä ei luotu/päivitetty
    expect(apurit.tila.insertJonot.hoitokaynnit).toBeUndefined()
    expect(apurit.tila.updateJonot.hoitokaynnit).toBeUndefined()
  })

  it('lisakentät-kentästä pyyhitään gdpr_hyvaksytty ja lupa_luovutukseen kopioinnissa', async () => {
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: {
        id: 'avoin-id',
        lisakentat: {
          gdpr_hyvaksytty:    true,
          lupa_luovutukseen:  false,
          omaKentta:          'arvo',
          toinenLisakentta:   123,
        },
      },
      error: null,
    })
    apurit.lisaaTulos('asiakastietolomake_versiot', { error: null }) // sulku
    apurit.lisaaTulos('lomake_sairaudet', { data: [], error: null })
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { id: 'uusi-versio-id' },
      error: null,
    })
    apurit.lisaaTulos('hoitokaynnit', { data: null, error: null })
    apurit.lisaaTulos('hoitokaynnit', { data: { id: 'b-id' }, error: null })

    await aloitaUusiKaynti('asiakas-1')

    // Vain yksi insert asiakastietolomake_versiot-tauluun (uusi versio).
    // Sulku on update, avoin haku on select — ei näy insertJonossa.
    const insertRivi = apurit.tila.insertJonot.asiakastietolomake_versiot[0]
    expect(insertRivi.lisakentat).toEqual({
      omaKentta:        'arvo',
      toinenLisakentta: 123,
    })
    expect(insertRivi.lisakentat).not.toHaveProperty('gdpr_hyvaksytty')
    expect(insertRivi.lisakentat).not.toHaveProperty('lupa_luovutukseen')
  })

  it('B-lomakkeen päivitys epäonnistuu — palauttaa varoituksen, ei virhettä', async () => {
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { id: 'avoin-id', lisakentat: null },
      error: null,
    })
    apurit.lisaaTulos('asiakastietolomake_versiot', { error: null })
    apurit.lisaaTulos('lomake_sairaudet', { data: [], error: null })
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { id: 'uusi-versio-id' },
      error: null,
    })
    apurit.lisaaTulos('hoitokaynnit', {
      data: { id: 'tyhja-b-id' },
      error: null,
    })
    // Tyhjän B:n päivitys epäonnistuu
    apurit.lisaaTulos('hoitokaynnit', {
      error: { message: 'verkkovirhe' },
    })

    const tulos = await aloitaUusiKaynti('asiakas-1')

    expect(tulos).toMatchObject({
      lomakeVersioId: 'uusi-versio-id',
      hoitokayntiId:  null,
      virhe:          null,
    })
    expect(tulos.varoitus).toEqual(expect.stringContaining('B-lomakkeen päivitys epäonnistui'))
    expect(tulos.varoitus).toEqual(expect.stringContaining('verkkovirhe'))
  })
})
