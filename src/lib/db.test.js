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
    eqKutsut:    {},  // taulu → [[kentta, arvo], ...] järjestyksessä
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
    ketju.delete      = vi.fn(() => ketju)
    ketju.eq          = vi.fn((kentta, arvo) => { lisaaJonoon(tila.eqKutsut, taulu, [kentta, arvo]); return ketju })
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
    tila.eqKutsut     = {}
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

// `lomakeTallennus` on puhdas funktiomoduuli (ei sivuvaikutuksia top-levelillä,
// ei DB-kutsuja). Käytetään oikeaa toteutusta jotta tallennaRenderoijastaLomake-
// testit voivat verifioida koko jaettu-rakenteen kulun.

import {
  tallennaAsiakas,
  aloitaUusiKaynti,
  tallennaHoitokirjaus,
  tallennaRenderoijastaLomake,
  luoUusiKentta,
  paivitaKentanPysyvyys,
  haeLomakepohja,
  tallennaKayntiVastauksilla,
  haeKayntiVastauksilla,
  lukitseKaynti,
  avaaKayntiUudelleen,
} from './db'

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
    // 6a. AB-T4d: hae edellinen valmis-käynti (null = ei edellistä → ei kopioi pysyviä)
    apurit.lisaaTulos('hoitokaynnit', { data: null, error: null })
    // 6b. Hae tyhjä B-lomake (select.eq.eq.order.limit.maybeSingle)
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
    apurit.lisaaTulos('hoitokaynnit', { data: null, error: null })  // AB-T4d: ei edellistä valmis-käyntiä
    apurit.lisaaTulos('hoitokaynnit', { data: null, error: null })  // ei tyhjää B
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
    apurit.lisaaTulos('hoitokaynnit', { data: null, error: null })  // AB-T4d: ei edellistä valmis-käyntiä
    apurit.lisaaTulos('hoitokaynnit', { data: null, error: null })  // ei tyhjää B
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
    apurit.lisaaTulos('hoitokaynnit', { data: null, error: null })  // AB-T4d: ei edellistä valmis-käyntiä
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

  // ─── AB-T4d: pysyvien kopiointi edellisestä valmis-käynnistä ──────────────

  it('AB-T4d: kopioi pysyvät kentät edellisen valmis-käynnin vastauksista uuteen jsonbiin', async () => {
    // Tavanomainen happy-path setup (avoin A + tyhjä B)
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { id: 'avoin-id', lisakentat: null },
      error: null,
    })
    apurit.lisaaTulos('asiakastietolomake_versiot', { error: null })  // sulku
    apurit.lisaaTulos('lomake_sairaudet', { data: [], error: null })
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { id: 'uusi-versio-id' },
      error: null,
    })
    // AB-T4d: edellinen valmis-käynti löytyi vastausten kanssa
    apurit.lisaaTulos('hoitokaynnit', {
      data: {
        vastaukset: {
          etunimi:    'Sara',     // pysyvä → kopioidaan
          sahkoposti: 'sara@example.com',  // pysyvä → kopioidaan
          paivan_kipu: 7,         // muuttuva → ei kopioida
          hoidon_kulku: 'aiemmin',// muuttuva → ei kopioida
        },
      },
      error: null,
    })
    // Kenttäkirjasto-haku: kahdella kentällä pysyva=true, kahdella false
    apurit.lisaaTulos('kenttakirjasto', {
      data: [
        { kentta_id_tunniste: 'etunimi',     kentan_versiot: [{ versio: 1, aktiivinen: true, pysyva: true }] },
        { kentta_id_tunniste: 'sahkoposti',  kentan_versiot: [{ versio: 1, aktiivinen: true, pysyva: true }] },
        { kentta_id_tunniste: 'paivan_kipu', kentan_versiot: [{ versio: 1, aktiivinen: true, pysyva: false }] },
        { kentta_id_tunniste: 'hoidon_kulku', kentan_versiot: [{ versio: 1, aktiivinen: true, pysyva: false }] },
      ],
      error: null,
    })
    // Tyhjän B haku + päivitys
    apurit.lisaaTulos('hoitokaynnit', { data: { id: 'tyhja-b-id' }, error: null })
    apurit.lisaaTulos('hoitokaynnit', { error: null })

    await aloitaUusiKaynti('asiakas-1')

    // B-lomakkeen päivitykseen tuli vastaukset-jsonb jossa vain pysyvät
    const paivitys = apurit.tila.updateJonot.hoitokaynnit[0]
    expect(paivitys.vastaukset).toEqual({
      etunimi:    'Sara',
      sahkoposti: 'sara@example.com',
    })
    expect(paivitys.vastaukset).not.toHaveProperty('paivan_kipu')
    expect(paivitys.vastaukset).not.toHaveProperty('hoidon_kulku')
  })

  it('AB-T4d: ensimmäinen käynti (ei edellistä valmis-käyntiä) → vastaukset on tyhjä jsonb', async () => {
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
    // AB-T4d: ei edellistä valmis-käyntiä → kenttäkirjasto-hakua EI tehdä
    apurit.lisaaTulos('hoitokaynnit', { data: null, error: null })
    apurit.lisaaTulos('hoitokaynnit', { data: { id: 'tyhja-b-id' }, error: null })
    apurit.lisaaTulos('hoitokaynnit', { error: null })

    await aloitaUusiKaynti('asiakas-1')

    const paivitys = apurit.tila.updateJonot.hoitokaynnit[0]
    expect(paivitys.vastaukset).toEqual({})
    // Kenttakirjasto-tauluun ei tehty kyselyä
    expect(apurit.fromVakooja).not.toHaveBeenCalledWith('kenttakirjasto')
  })

  it('AB-T4d: edellisen valmis-käynnin vastaukset on tyhjä → kenttäkirjasto-hakua ei tehdä', async () => {
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
    // AB-T4d: edellinen löytyi mutta vastaukset on tyhjä → ei kannata hakea kenttäkirjastoa
    apurit.lisaaTulos('hoitokaynnit', { data: { vastaukset: {} }, error: null })
    apurit.lisaaTulos('hoitokaynnit', { data: { id: 'tyhja-b-id' }, error: null })
    apurit.lisaaTulos('hoitokaynnit', { error: null })

    await aloitaUusiKaynti('asiakas-1')

    const paivitys = apurit.tila.updateJonot.hoitokaynnit[0]
    expect(paivitys.vastaukset).toEqual({})
    expect(apurit.fromVakooja).not.toHaveBeenCalledWith('kenttakirjasto')
  })

  it('AB-T4d: WHERE-ehto suodattaa vain valmis-tilaiset (ei luonnos-käyntejä)', async () => {
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
    // Mockkina edellisen valmis-käynnin haku → null (DB suodatti pois luonnos-käynnit)
    apurit.lisaaTulos('hoitokaynnit', { data: null, error: null })
    apurit.lisaaTulos('hoitokaynnit', { data: { id: 'tyhja-b-id' }, error: null })
    apurit.lisaaTulos('hoitokaynnit', { error: null })

    await aloitaUusiKaynti('asiakas-1')

    // Verifioi että edellisen-käynnin haku tehtiin ja sisältää tila='valmis' -ehdon
    const eqit = apurit.tila.eqKutsut.hoitokaynnit ?? []
    // Edellisen valmis-käynnin haku: ('asiakas_id', 'asiakas-1') + ('tila', 'valmis')
    expect(eqit).toContainEqual(['asiakas_id', 'asiakas-1'])
    expect(eqit).toContainEqual(['tila', 'valmis'])
  })
})

describe('tallennaHoitokirjaus', () => {
  let errorVakooja

  beforeEach(() => {
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.nollaa()
    errorVakooja = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorVakooja.mockRestore()
  })

  it('palauttaa virheen jos hoitokaynti-id puuttuu', async () => {
    expect(await tallennaHoitokirjaus(null, {})).toEqual({ virhe: 'Hoitokaynti-id puuttuu' })
    expect(apurit.fromVakooja).not.toHaveBeenCalled()
  })

  it('tallentaa onnistuneesti ilman versio-numeroa — ei optimistista lukkoa', async () => {
    apurit.lisaaTulos('hoitokaynnit', {
      data:  [{ id: 'h1', versio: 1 }],
      error: null,
    })

    const tulos = await tallennaHoitokirjaus('h1', { otsikko: 'Niska' })

    expect(tulos).toEqual({ virhe: null, versio: 1 })

    // Optimistinen lukko ohitetaan kun versio-kenttää ei ole syötteessä:
    // .eq-kutsujen joukossa pitäisi olla VAIN ('id', 'h1') — ei ('versio', ...)
    const eqit = apurit.tila.eqKutsut.hoitokaynnit ?? []
    expect(eqit).toEqual([['id', 'h1']])

    // Versio-laskuri kuitenkin asetetaan: (null ?? 0) + 1 = 1
    expect(apurit.tila.updateJonot.hoitokaynnit[0].versio).toBe(1)
  })

  it('tallentaa onnistuneesti versio-numerolla — lisää optimistisen lukon', async () => {
    apurit.lisaaTulos('hoitokaynnit', {
      data:  [{ id: 'h1', versio: 6 }],
      error: null,
    })

    const tulos = await tallennaHoitokirjaus('h1', { otsikko: 'Niska', versio: 5 })

    expect(tulos).toEqual({ virhe: null, versio: 6 })

    // Optimistinen lukko: WHERE id=h1 AND versio=5
    const eqit = apurit.tila.eqKutsut.hoitokaynnit ?? []
    expect(eqit).toEqual([
      ['id',     'h1'],
      ['versio', 5],
    ])

    // Versio kasvatetaan: 5 + 1 = 6
    expect(apurit.tila.updateJonot.hoitokaynnit[0].versio).toBe(6)
  })

  it('vain sallitut kentät päivittyvät, ei-sallitut ohitetaan', async () => {
    apurit.lisaaTulos('hoitokaynnit', {
      data:  [{ id: 'h1', versio: 1 }],
      error: null,
    })

    await tallennaHoitokirjaus('h1', {
      otsikko:           'Niska',
      haitallinenKentta: 'XSS',
      salasana:          'hack',
      jokuMuu:           42,
    })

    const muutokset = apurit.tila.updateJonot.hoitokaynnit[0]
    // Allowlist sallii vain otsikon. paivitetty + versio funktio lisää itse.
    expect(Object.keys(muutokset).sort()).toEqual(['otsikko', 'paivitetty', 'versio'].sort())
    expect(muutokset.otsikko).toBe('Niska')
    expect(muutokset).not.toHaveProperty('haitallinenKentta')
    expect(muutokset).not.toHaveProperty('salasana')
    expect(muutokset).not.toHaveProperty('jokuMuu')
  })

  it('tyhjä merkkijono kentässä → tallennetaan null:na', async () => {
    apurit.lisaaTulos('hoitokaynnit', {
      data:  [{ id: 'h1', versio: 1 }],
      error: null,
    })

    await tallennaHoitokirjaus('h1', {
      otsikko:   '',
      kesto_min: 30,
    })

    const muutokset = apurit.tila.updateJonot.hoitokaynnit[0]
    expect(muutokset.otsikko).toBeNull()
    // Numerot ja muut ei-tyhjät arvot välittyvät sellaisenaan
    expect(muutokset.kesto_min).toBe(30)
  })

  it('versio-ristiriita — palauttaa ristiriita: true + nykyinenVersio', async () => {
    // 1. Update palauttaa 0 päivitettyä riviä → versio ei täsmännyt
    apurit.lisaaTulos('hoitokaynnit', {
      data:  [],
      error: null,
    })
    // 2. Seuraava select hakee nykyisen DB-version
    apurit.lisaaTulos('hoitokaynnit', {
      data:  { versio: 7 },
      error: null,
    })

    const tulos = await tallennaHoitokirjaus('h1', { otsikko: 'X', versio: 3 })

    expect(tulos).toMatchObject({
      ristiriita:     true,
      nykyinenVersio: 7,
    })
    expect(typeof tulos.virhe).toBe('string')
    expect(tulos.virhe.length).toBeGreaterThan(0)
  })

  it('DB-virhe update-kutsussa — palauttaa virhe.message', async () => {
    apurit.lisaaTulos('hoitokaynnit', {
      data:  null,
      error: { message: 'PostgreSQL connection lost' },
    })

    const tulos = await tallennaHoitokirjaus('h1', { otsikko: 'X' })

    expect(tulos).toEqual({ virhe: 'PostgreSQL connection lost' })
    expect(errorVakooja).toHaveBeenCalledWith(
      'Hoitokirjauksen tallennus epäonnistui:',
      expect.objectContaining({ message: 'PostgreSQL connection lost' }),
    )
  })
})

describe('tallennaRenderoijastaLomake', () => {
  let errorVakooja

  beforeEach(() => {
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.nollaa()
    errorVakooja = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorVakooja.mockRestore()
  })

  // Apuri uudelle (UUSI-haaran) happy-path -mockien asetukseen.
  // 1. asiakkaat.upsert  → annettu asiakas
  // 2. asiakastietolomake_versiot.select → ei olemassa olevaa versiota
  // 3. asiakastietolomake_versiot.insert → annettu uusi versio
  const setupHappyUusi = (asiakasId = 'a1', versioId = 'v1') => {
    apurit.lisaaTulos('asiakkaat', { data: { id: asiakasId }, error: null })
    apurit.lisaaTulos('asiakastietolomake_versiot', { data: null, error: null })
    apurit.lisaaTulos('asiakastietolomake_versiot', { data: { id: versioId }, error: null })
  }

  it('palauttaa virheen jos käyttäjä ei ole kirjautunut', async () => {
    apurit.tila.getUserTulos = {
      data: { user: null },
      error: { message: 'session expired' },
    }
    const tulos = await tallennaRenderoijastaLomake({ vastaukset: {} })
    expect(tulos).toEqual({ virhe: 'Kirjautuminen vaaditaan' })
    // Ei DB-kutsuja
    expect(apurit.fromVakooja).not.toHaveBeenCalled()
  })

  it("asiakkaan upsert epäonnistuu — palauttaa virheen ('Asiakkaan tallennus: ...')", async () => {
    apurit.lisaaTulos('asiakkaat', {
      data: null,
      error: { message: 'unique violation' },
    })

    const tulos = await tallennaRenderoijastaLomake({
      vastaukset: { sahkoposti: 'a@b.fi' },
    })

    expect(tulos).toEqual({ virhe: 'Asiakkaan tallennus: unique violation' })
    // Lomakeversiota tai sairauksia ei kosketa
    expect(apurit.fromVakooja).toHaveBeenCalledWith('asiakkaat')
    expect(apurit.fromVakooja).not.toHaveBeenCalledWith('asiakastietolomake_versiot')
    expect(apurit.fromVakooja).not.toHaveBeenCalledWith('lomake_sairaudet')
  })

  it('happy path UUSI asiakas (ei olemassa olevaa versiota) — INSERT versio + INSERT sairaudet', async () => {
    setupHappyUusi('a1', 'v1')
    apurit.lisaaTulos('lomake_sairaudet', { error: null })

    const tulos = await tallennaRenderoijastaLomake({
      vastaukset: { sahkoposti: 'a@b.fi', sairaudet: [1, 2] },
    })

    expect(tulos).toEqual({
      asiakasId:      'a1',
      lomakeVersioId: 'v1',
      virhe:          null,
    })

    // UUSI-haarassa lomakeversiota EI päivitetä, vaan luodaan
    expect(apurit.tila.updateJonot.asiakastietolomake_versiot).toBeUndefined()
    expect(apurit.tila.insertJonot.asiakastietolomake_versiot).toHaveLength(1)
    expect(apurit.tila.insertJonot.asiakastietolomake_versiot[0]).toMatchObject({
      asiakas_id:      'a1',
      muokkaaja_id:    'mock-uid',
      muokkaaja_rooli: 'hoitaja',
    })

    // Sairaudet kopioitu uudelle versiolle
    expect(apurit.tila.insertJonot.lomake_sairaudet).toHaveLength(1)
    const sairausRivit = apurit.tila.insertJonot.lomake_sairaudet[0]
    expect(sairausRivit).toEqual([
      { lomake_versio_id: 'v1', sairaus_tyyppi_id: 1, on_voimassa: true },
      { lomake_versio_id: 'v1', sairaus_tyyppi_id: 2, on_voimassa: true },
    ])
  })

  it('happy path OLEMASSA OLEVA versio — UPDATE versio + DELETE+INSERT sairaudet', async () => {
    apurit.lisaaTulos('asiakkaat', { data: { id: 'a1' }, error: null })
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { id: 'v1' }, // versio löytyy → UPDATE-haara
      error: null,
    })
    apurit.lisaaTulos('asiakastietolomake_versiot', { error: null }) // update onnistuu
    apurit.lisaaTulos('lomake_sairaudet', { error: null }) // delete
    apurit.lisaaTulos('lomake_sairaudet', { error: null }) // insert

    const tulos = await tallennaRenderoijastaLomake({
      vastaukset: { sahkoposti: 'a@b.fi', sairaudet: [1] },
      asiakasIdJosOlemassa: 'a1',
    })

    expect(tulos).toEqual({
      asiakasId:      'a1',
      lomakeVersioId: 'v1',
      virhe:          null,
    })

    // UPDATE-haarassa versiota päivitetään, ei lisätä
    expect(apurit.tila.updateJonot.asiakastietolomake_versiot).toHaveLength(1)
    expect(apurit.tila.insertJonot.asiakastietolomake_versiot).toBeUndefined()

    // Sairaudet käsiteltiin: ensin delete, sitten insert
    // (jonojen järjestys takaa kutsujärjestyksen koska samasta from-kutsusta
    // saatua ketjua ei voi käyttää uudelleen)
    expect(apurit.tila.insertJonot.lomake_sairaudet).toHaveLength(1)

    // upsert-asiakasrivi sai id-kentän kun asiakasIdJosOlemassa annettu
    expect(apurit.tila.upsertJonot.asiakkaat[0].id).toBe('a1')
  })

  it('otsikko-käsittely: ei annettu → null, "   " → null, "Niska" → tallennetaan', async () => {
    // HUOM: alkuperäisen spec-tekstin "undefined → ei mukaan" -tapaus EI ole
    // saavutettavissa nykyisellä koodilla, koska funktion destructuring-default
    // (`otsikko = null`) tekee dead-code-haaran `: {}` saavuttamattomaksi.
    // Tämä testi lukitsee TODELLISEN nykyisen käyttäytymisen.

    // a) Ei otsikkoa → default null → otsikko-kenttä on mukana null-arvolla
    setupHappyUusi('a1', 'v1')
    await tallennaRenderoijastaLomake({ vastaukset: { sahkoposti: 'a@b.fi' } })
    let insertRivi = apurit.tila.insertJonot.asiakastietolomake_versiot[0]
    expect(insertRivi).toHaveProperty('otsikko')
    expect(insertRivi.otsikko).toBeNull()

    // b) Pelkkää whitespacea → trimataan tyhjäksi → null
    apurit.nollaa()
    setupHappyUusi('a1', 'v1')
    await tallennaRenderoijastaLomake({
      vastaukset: { sahkoposti: 'a@b.fi' },
      otsikko: '   ',
    })
    insertRivi = apurit.tila.insertJonot.asiakastietolomake_versiot[0]
    expect(insertRivi.otsikko).toBeNull()

    // c) Kunnon teksti → tallennetaan sellaisenaan
    apurit.nollaa()
    setupHappyUusi('a1', 'v1')
    await tallennaRenderoijastaLomake({
      vastaukset: { sahkoposti: 'a@b.fi' },
      otsikko: 'Niska',
    })
    insertRivi = apurit.tila.insertJonot.asiakastietolomake_versiot[0]
    expect(insertRivi.otsikko).toBe('Niska')
  })

  it('lomakeversion päivitys epäonnistuu — palauttaa virhe + asiakasId', async () => {
    apurit.lisaaTulos('asiakkaat', { data: { id: 'a1' }, error: null })
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { id: 'v1' }, // olemassa → UPDATE-haara
      error: null,
    })
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      error: { message: 'X' },
    })

    const tulos = await tallennaRenderoijastaLomake({
      vastaukset: { sahkoposti: 'a@b.fi' },
      asiakasIdJosOlemassa: 'a1',
    })

    expect(tulos).toEqual({
      virhe:     'Lomakeversion päivitys: X',
      asiakasId: 'a1',
    })
    // Ei jatkettu sairauksiin
    expect(apurit.fromVakooja).not.toHaveBeenCalledWith('lomake_sairaudet')
  })

  it('sairauksien tallennus epäonnistuu — palauttaa virhe + asiakasId + lomakeVersioId', async () => {
    setupHappyUusi('a1', 'v1')
    apurit.lisaaTulos('lomake_sairaudet', {
      error: { message: 'Y' },
    })

    const tulos = await tallennaRenderoijastaLomake({
      vastaukset: { sahkoposti: 'a@b.fi', sairaudet: [1] },
    })

    expect(tulos).toEqual({
      virhe:          'Sairauksien tallennus: Y',
      asiakasId:      'a1',
      lomakeVersioId: 'v1',
    })
  })

  it('vastauksissa ei sairauksia (tyhjä lista) — ei kutsuta lomake_sairaudet.insertiä lainkaan', async () => {
    setupHappyUusi('a1', 'v1')
    // EI lisätä lomake_sairaudet-tulosta — koodi ei saa kutsua sitä

    const tulos = await tallennaRenderoijastaLomake({
      vastaukset: { sahkoposti: 'a@b.fi' }, // ei sairaudet-avainta
    })

    expect(tulos).toEqual({
      asiakasId:      'a1',
      lomakeVersioId: 'v1',
      virhe:          null,
    })
    expect(apurit.fromVakooja).not.toHaveBeenCalledWith('lomake_sairaudet')
    expect(apurit.tila.insertJonot.lomake_sairaudet).toBeUndefined()
  })
})

describe('luoUusiKentta — pysyva-kentän käsittely (AB-T1a)', () => {
  let errorVakooja

  beforeEach(() => {
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.nollaa()
    errorVakooja = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorVakooja.mockRestore()
  })

  // Apuri: setupoi mockit kahdelle insertille (kenttakirjasto + kentan_versiot)
  const setupOnnistuvaLuonti = (kenttaId = 'kentta-1') => {
    // 1. kenttakirjasto.insert.select('id').single() → palauttaa luodun kentän id:n
    apurit.lisaaTulos('kenttakirjasto', { data: { id: kenttaId }, error: null })
    // 2. kentan_versiot.insert → onnistuu (ei .select(), terminaali on insert itse)
    apurit.lisaaTulos('kentan_versiot', { error: null })
  }

  it('ilman pysyva-parametria → tallentaa kentan_versiot-riviin pysyva: false (default)', async () => {
    setupOnnistuvaLuonti('uusi-id')

    const tulos = await luoUusiKentta({
      tunniste: 'oma_kentta',
      tyyppi:   'tekstikentta',
      otsikko:  'Oma kenttä',
    })

    expect(tulos).toEqual({ kenttaId: 'uusi-id', tunniste: 'oma_kentta', virhe: null })

    // kentan_versiot-insertissä pitäisi olla pysyva: false
    expect(apurit.tila.insertJonot.kentan_versiot).toHaveLength(1)
    const versioRivi = apurit.tila.insertJonot.kentan_versiot[0]
    expect(versioRivi.pysyva).toBe(false)
  })

  it('pysyva: true annettu → välittyy kentan_versiot-insertiin sellaisenaan', async () => {
    setupOnnistuvaLuonti('uusi-id-2')

    await luoUusiKentta({
      tunniste: 'sahkoposti',
      tyyppi:   'sahkoposti',
      otsikko:  'Sähköposti',
      pysyva:   true,
    })

    const versioRivi = apurit.tila.insertJonot.kentan_versiot[0]
    expect(versioRivi.pysyva).toBe(true)
  })

  it('pysyva: false annettu eksplisiittisesti → välittyy kentan_versiot-insertiin', async () => {
    setupOnnistuvaLuonti('uusi-id-3')

    await luoUusiKentta({
      tunniste: 'paivan_kipu',
      tyyppi:   'numero',
      otsikko:  'Päivän kipu',
      pysyva:   false,
    })

    const versioRivi = apurit.tila.insertJonot.kentan_versiot[0]
    expect(versioRivi.pysyva).toBe(false)
  })
})

describe('paivitaKentanPysyvyys (AB-T1b1)', () => {
  let errorVakooja

  beforeEach(() => {
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.nollaa()
    errorVakooja = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorVakooja.mockRestore()
  })

  it('kenttaId puuttuu → palauttaa virheen, ei DB-kutsuja', async () => {
    expect(await paivitaKentanPysyvyys(null, true)).toEqual({ virhe: 'Kentta-id puuttuu' })
    expect(apurit.fromVakooja).not.toHaveBeenCalled()
  })

  it('pysyva ei ole boolean → palauttaa virheen, ei DB-kutsuja', async () => {
    expect(await paivitaKentanPysyvyys('k1', 'true')).toEqual({ virhe: 'pysyva-arvo puuttuu (true/false)' })
    expect(await paivitaKentanPysyvyys('k1', 1)).toEqual({ virhe: 'pysyva-arvo puuttuu (true/false)' })
    expect(await paivitaKentanPysyvyys('k1', undefined)).toEqual({ virhe: 'pysyva-arvo puuttuu (true/false)' })
    expect(apurit.fromVakooja).not.toHaveBeenCalled()
  })

  it('happy path → hakee aktiivisen version ja päivittää sen pysyva-kentän', async () => {
    // 1. Hae aktiivinen versio
    apurit.lisaaTulos('kentan_versiot', { data: { id: 'versio-1' }, error: null })
    // 2. Päivitä pysyva
    apurit.lisaaTulos('kentan_versiot', { error: null })

    const tulos = await paivitaKentanPysyvyys('kentta-id-1', true)

    expect(tulos).toEqual({ virhe: null })
    // Update-rivi sisältää vain pysyva-kentän
    expect(apurit.tila.updateJonot.kentan_versiot).toHaveLength(1)
    expect(apurit.tila.updateJonot.kentan_versiot[0]).toEqual({ pysyva: true })
  })

  it('kentällä ei ole aktiivista versiota → palauttaa virheen, ei UPDATE-kutsua', async () => {
    apurit.lisaaTulos('kentan_versiot', { data: null, error: null })

    const tulos = await paivitaKentanPysyvyys('kentta-id-orphan', false)

    expect(tulos).toEqual({ virhe: 'Kentällä ei ole aktiivista versiota' })
    expect(apurit.tila.updateJonot.kentan_versiot).toBeUndefined()
  })
})

describe('haeLomakepohja — osion rooli normalisointi (AB-T2a)', () => {
  beforeEach(() => {
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.nollaa()
  })

  // Apuri: tee mock-vaste 'lomakepohjat'-taululle annetuilla osioilla.
  // Osiot ovat tyhjiä (kenttat: []), jotta haeLomakepohja ei tee toista
  // kyselyä kenttäkirjastoon — testit fokusoivat vain rooli-normalisointiin.
  const setupPohja = (osiot) => {
    apurit.lisaaTulos('lomakepohjat', {
      data: {
        id:         'pohja-1',
        nimi:       'Testipohja',
        kuvaus:     null,
        on_oletus:  false,
        aktiivinen: true,
        lomakepohja_versiot: [{
          versio: 1,
          rakenne: {
            formaatti_versio: 1,
            nayttotyyli: 'c',
            osiot,
          },
        }],
      },
      error: null,
    })
  }

  it('osio ilman rooli-kenttää saa oletuksen "asiakas"', async () => {
    setupPohja([
      { id: 'o1', otsikko: 'Asiakkaan osio', kenttat: [] },
    ])

    const tulos = await haeLomakepohja('pohja-1')

    expect(tulos.virhe).toBeNull()
    expect(tulos.rakenne.osiot).toHaveLength(1)
    expect(tulos.rakenne.osiot[0].rooli).toBe('asiakas')
    // Muut osio-kentät säilyvät
    expect(tulos.rakenne.osiot[0].id).toBe('o1')
    expect(tulos.rakenne.osiot[0].otsikko).toBe('Asiakkaan osio')
  })

  it('osio jolla on rooli "asiakas" tai "hoitaja" säilyttää sen', async () => {
    setupPohja([
      { id: 'o1', otsikko: 'Asiakkaan osio', rooli: 'asiakas', kenttat: [] },
      { id: 'o2', otsikko: 'Hoitajan osio',  rooli: 'hoitaja', kenttat: [] },
    ])

    const tulos = await haeLomakepohja('pohja-1')

    expect(tulos.rakenne.osiot[0].rooli).toBe('asiakas')
    expect(tulos.rakenne.osiot[1].rooli).toBe('hoitaja')
  })

  it('virheellinen rooli-arvo normalisoituu "asiakas"-arvoksi', async () => {
    setupPohja([
      { id: 'o1', otsikko: 'Outo merkkijono', rooli: 'jokin_muu', kenttat: [] },
      { id: 'o2', otsikko: 'Tyhjä',           rooli: '',           kenttat: [] },
      { id: 'o3', otsikko: 'Null',            rooli: null,         kenttat: [] },
      { id: 'o4', otsikko: 'Numero',          rooli: 42,           kenttat: [] },
    ])

    const tulos = await haeLomakepohja('pohja-1')

    expect(tulos.rakenne.osiot[0].rooli).toBe('asiakas')
    expect(tulos.rakenne.osiot[1].rooli).toBe('asiakas')
    expect(tulos.rakenne.osiot[2].rooli).toBe('asiakas')
    expect(tulos.rakenne.osiot[3].rooli).toBe('asiakas')
  })
})

describe('tallennaKayntiVastauksilla (AB-T4a)', () => {
  let errorVakooja

  beforeEach(() => {
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.nollaa()
    errorVakooja = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorVakooja.mockRestore()
  })

  it('tallentaa vastaukset jsonb-saraakkeeseen + uusi versio', async () => {
    apurit.lisaaTulos('hoitokaynnit', {
      data:  [{ id: 'h1', versio: 1 }],
      error: null,
    })

    const tulos = await tallennaKayntiVastauksilla('h1', { otsikko: 'Niska', kipu: 5 })

    expect(tulos).toEqual({ virhe: null, versio: 1 })

    // UPDATE-rivi sisältää vastaukset-jsonbin + paivitetty + versio
    const muutokset = apurit.tila.updateJonot.hoitokaynnit[0]
    expect(muutokset.vastaukset).toEqual({ otsikko: 'Niska', kipu: 5 })
    expect(muutokset.versio).toBe(1)
    expect(typeof muutokset.paivitetty).toBe('string')

    // odotettuVersio = null → eq:lle vain ('id', 'h1'), ei ('versio', N)
    const eqit = apurit.tila.eqKutsut.hoitokaynnit ?? []
    expect(eqit).toEqual([['id', 'h1']])
  })

  it('optimistinen lukko ristiriidassa palauttaa { ristiriita: true, nykyinenVersio }', async () => {
    // 1. Update palauttaa 0 päivitettyä riviä → versio ei täsmännyt
    apurit.lisaaTulos('hoitokaynnit', { data: [], error: null })
    // 2. Seuraava select hakee nykyisen DB-version
    apurit.lisaaTulos('hoitokaynnit', { data: { versio: 7 }, error: null })

    const tulos = await tallennaKayntiVastauksilla('h1', { foo: 'bar' }, 3)

    expect(tulos).toMatchObject({
      ristiriita:     true,
      nykyinenVersio: 7,
    })
    expect(typeof tulos.virhe).toBe('string')

    // optimistinen lukko: WHERE id=h1 AND versio=3
    const eqit = apurit.tila.eqKutsut.hoitokaynnit ?? []
    expect(eqit[0]).toEqual(['id', 'h1'])
    expect(eqit[1]).toEqual(['versio', 3])
  })

  it('virheellinen vastaukset-arvo (null/array) → palauttaa virheen, ei DB-kutsuja', async () => {
    expect(await tallennaKayntiVastauksilla('h1', null)).toEqual({ virhe: 'Vastaukset puuttuvat tai virheellinen muoto' })
    expect(await tallennaKayntiVastauksilla('h1', [])).toEqual({ virhe: 'Vastaukset puuttuvat tai virheellinen muoto' })
    expect(apurit.fromVakooja).not.toHaveBeenCalled()
  })
})

describe('haeKayntiVastauksilla (AB-T4a)', () => {
  beforeEach(() => {
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.nollaa()
  })

  it('uusi käynti (vastaukset jsonb täynnä) → palauttaa lahde="hoitokaynnit"', async () => {
    apurit.lisaaTulos('hoitokaynnit', {
      data: {
        id:               'h1',
        vastaukset:       { otsikko: 'Niska', kipu: 5 },
        tila:             'luonnos',
        versio:           3,
        otsikko:          'Niska',
        pvm:              '2026-05-03T10:00:00Z',
        lomake_versio_id: 'v1',  // vaikka linkki olemassa, jsonb otetaan etusijalle
      },
      error: null,
    })

    const tulos = await haeKayntiVastauksilla('h1')

    expect(tulos).toEqual({
      vastaukset: { otsikko: 'Niska', kipu: 5 },
      tila:       'luonnos',
      versio:     3,
      otsikko:    'Niska',
      pvm:        '2026-05-03T10:00:00Z',
      lahde:      'hoitokaynnit',
    })
    // Ei toista DB-kutsua — uusi formaatti riittää
    expect(apurit.fromVakooja).toHaveBeenCalledTimes(1)
  })

  it('vanha käynti (vastaukset tyhjä, lomake_versio_id) → palauttaa lisakentat asiakastietolomake_versiot:sta', async () => {
    apurit.lisaaTulos('hoitokaynnit', {
      data: {
        id:               'h2',
        vastaukset:       {},
        tila:             'valmis',
        versio:           1,
        otsikko:          'Vanha käynti',
        pvm:              '2026-04-15T10:00:00Z',
        lomake_versio_id: 'v-vanha',
      },
      error: null,
    })
    apurit.lisaaTulos('asiakastietolomake_versiot', {
      data: { lisakentat: { kehonkartta_piirros: 'data:image/...', oma_kentta: 'X' } },
      error: null,
    })

    const tulos = await haeKayntiVastauksilla('h2')

    expect(tulos).toEqual({
      vastaukset: { kehonkartta_piirros: 'data:image/...', oma_kentta: 'X' },
      tila:       'valmis',
      versio:     1,
      otsikko:    'Vanha käynti',
      pvm:        '2026-04-15T10:00:00Z',
      lahde:      'asiakastietolomake_versiot',
    })
    // 2 kutsua: hoitokaynnit + asiakastietolomake_versiot
    expect(apurit.fromVakooja).toHaveBeenCalledTimes(2)
  })

  it('uusi luonnos jossa vastaukset vielä tyhjä, ei lomake_versio_id:tä → palauttaa tyhjän objektin', async () => {
    apurit.lisaaTulos('hoitokaynnit', {
      data: {
        id:               'h3',
        vastaukset:       {},
        tila:             'luonnos',
        versio:           0,
        otsikko:          null,
        pvm:              null,
        lomake_versio_id: null,
      },
      error: null,
    })

    const tulos = await haeKayntiVastauksilla('h3')

    expect(tulos.vastaukset).toEqual({})
    expect(tulos.lahde).toBe('hoitokaynnit')
  })
})

describe('lukitseKaynti (AB-T4c)', () => {
  let errorVakooja

  beforeEach(() => {
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.nollaa()
    errorVakooja = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorVakooja.mockRestore()
  })

  it('onnistunut lukitus → asettaa tila="valmis" + uusi versio', async () => {
    apurit.lisaaTulos('hoitokaynnit', {
      data:  [{ id: 'h1', versio: 6 }],
      error: null,
    })

    const tulos = await lukitseKaynti('h1', 5)

    expect(tulos).toEqual({ virhe: null, versio: 6 })

    const muutokset = apurit.tila.updateJonot.hoitokaynnit[0]
    expect(muutokset.tila).toBe('valmis')
    expect(muutokset.versio).toBe(6)            // 5 + 1
    expect(typeof muutokset.paivitetty).toBe('string')

    // Optimistinen lukko: WHERE id=h1 AND versio=5
    const eqit = apurit.tila.eqKutsut.hoitokaynnit ?? []
    expect(eqit).toEqual([['id', 'h1'], ['versio', 5]])
  })

  it('versio-ristiriita → palauttaa { ristiriita: true, nykyinenVersio }', async () => {
    apurit.lisaaTulos('hoitokaynnit', { data: [], error: null })       // 0 päivitettyä
    apurit.lisaaTulos('hoitokaynnit', { data: { versio: 9 }, error: null })

    const tulos = await lukitseKaynti('h1', 3)

    expect(tulos).toMatchObject({
      ristiriita:     true,
      nykyinenVersio: 9,
    })
    expect(typeof tulos.virhe).toBe('string')
  })
})

describe('avaaKayntiUudelleen (AB-T4c)', () => {
  let errorVakooja

  beforeEach(() => {
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.nollaa()
    errorVakooja = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorVakooja.mockRestore()
  })

  it('onnistunut avaus → tila="luonnos", laskuri+1, uusi loki-merkintä', async () => {
    // 1. Hae nykyinen loki + tila
    apurit.lisaaTulos('hoitokaynnit', {
      data: {
        avattu_uudelleen_kerralla:  2,
        avattu_uudelleen_kasittely: [
          { aikaleima: '2026-04-01T10:00:00Z', hoitaja_id: 'h-eka', syy: null },
          { aikaleima: '2026-04-15T11:30:00Z', hoitaja_id: 'h-eka', syy: 'unohtui' },
        ],
        tila: 'valmis',
      },
      error: null,
    })
    // 2. UPDATE
    apurit.lisaaTulos('hoitokaynnit', {
      data:  [{ id: 'h1' }],
      error: null,
    })

    const tulos = await avaaKayntiUudelleen('h1', '  Päivän kipu väärin merkitty  ')

    expect(tulos).toEqual({ virhe: null, avattuKerralla: 3 })

    const muutokset = apurit.tila.updateJonot.hoitokaynnit[0]
    expect(muutokset.tila).toBe('luonnos')
    expect(muutokset.avattu_uudelleen_kerralla).toBe(3)
    expect(muutokset.avattu_uudelleen_kasittely).toHaveLength(3)
    // Uusin merkintä on viimeinen
    const uusin = muutokset.avattu_uudelleen_kasittely[2]
    expect(uusin.hoitaja_id).toBe('mock-uid')
    expect(uusin.syy).toBe('Päivän kipu väärin merkitty')   // trimmattu
    expect(typeof uusin.aikaleima).toBe('string')
    // Aiempi loki säilyy
    expect(muutokset.avattu_uudelleen_kasittely[0].syy).toBeNull()
    expect(muutokset.avattu_uudelleen_kasittely[1].syy).toBe('unohtui')

    // Eq-kutsut: 1) hae-vaiheen id, 2) UPDATE:n id, 3) UPDATE:n race-suojaus tila='valmis'
    const eqit = apurit.tila.eqKutsut.hoitokaynnit ?? []
    expect(eqit).toEqual([
      ['id',   'h1'],   // select-vaihe
      ['id',   'h1'],   // update-vaihe
      ['tila', 'valmis'],// race-suojaus
    ])
  })

  it('käynti ei ole "valmis" → palauttaa virheen, ei UPDATE-kutsua', async () => {
    apurit.lisaaTulos('hoitokaynnit', {
      data: { avattu_uudelleen_kerralla: 0, avattu_uudelleen_kasittely: [], tila: 'luonnos' },
      error: null,
    })

    const tulos = await avaaKayntiUudelleen('h1')

    expect(tulos).toEqual({ virhe: 'Käynti ei ole lukittu (tila ei ole "valmis")' })
    expect(apurit.tila.updateJonot.hoitokaynnit).toBeUndefined()
  })

  it('race condition: joku muu on jo avannut → palauttaa virheen', async () => {
    // Hae onnistuu, tila='valmis' edelleen
    apurit.lisaaTulos('hoitokaynnit', {
      data: { avattu_uudelleen_kerralla: 0, avattu_uudelleen_kasittely: [], tila: 'valmis' },
      error: null,
    })
    // UPDATE palauttaa 0 riviä koska WHERE tila='valmis' ei matchaa
    // (joku muu vaihtoi sen 'luonnos':ksi väliin)
    apurit.lisaaTulos('hoitokaynnit', { data: [], error: null })

    const tulos = await avaaKayntiUudelleen('h1')

    expect(tulos).toEqual({ virhe: 'Joku muu on jo avannut käynnin' })
  })
})
