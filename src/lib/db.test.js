import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoistataan mockit vi.mock-tehtaan käyttöön. Pidetään tila yhdessä
// objektissa jotta yksittäinen testi voi vaihtaa palautettavan datan.
const apurit = vi.hoisted(() => {
  const tila = {
    singleTulos: { data: null, error: null },
    getUserTulos: { data: { user: { id: 'mock-uid' } } },
  }
  const upsertVakooja = vi.fn(() => ({
    select: () => ({
      single: () => Promise.resolve(tila.singleTulos),
    }),
  }))
  const fromVakooja = vi.fn(() => ({ upsert: upsertVakooja }))
  const getUserVakooja = vi.fn(() => Promise.resolve(tila.getUserTulos))
  return { tila, upsertVakooja, fromVakooja, getUserVakooja }
})

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: apurit.getUserVakooja },
    from: apurit.fromVakooja,
  },
}))

// db.js tuo myös lomakeTallennus-moduulin — mockataan jotta importti ei
// laukaise sivuvaikutuksia testiympäristössä.
vi.mock('./lomakeTallennus', () => ({
  jaaVastaukset: vi.fn(),
  kokoaVastaukset: vi.fn(),
}))

import { tallennaAsiakas } from './db'

describe('tallennaAsiakas', () => {
  beforeEach(() => {
    apurit.upsertVakooja.mockClear()
    apurit.fromVakooja.mockClear()
    apurit.getUserVakooja.mockClear()
    apurit.tila.singleTulos = { data: null, error: null }
    apurit.tila.getUserTulos = { data: { user: { id: 'mock-uid' } } }
  })

  it('tallentaa asiakkaan onnistuneesti — palauttaa asiakas-objektin', async () => {
    apurit.tila.singleTulos = {
      data: { id: 'uusi-id', nimi: 'Maija Meikäläinen' },
      error: null,
    }

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
    expect(apurit.upsertVakooja).toHaveBeenCalledTimes(1)

    const lahetettyRivi = apurit.upsertVakooja.mock.calls[0][0]
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
    apurit.tila.singleTulos = {
      data: null,
      error: { message: 'tietokantavirhe', code: '23505' },
    }
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
    apurit.tila.singleTulos = {
      data: { id: 'jokin' },
      error: null,
    }

    await tallennaAsiakas({
      nimi: 'Tyhjä Testi',
      sahkoposti: 'tyhja@example.com',
      syntymaaika: '',
      pituus: '',
      paino: '',
    })

    const lahetettyRivi = apurit.upsertVakooja.mock.calls[0][0]
    // db.js käyttää `data.kentta || null` → tyhjä merkkijono muuttuu null:ksi.
    // Tämä testi lukitsee nykyisen käyttäytymisen R1-T3-refaktoroinnin ajaksi.
    expect(lahetettyRivi.syntymaaika).toBeNull()
    expect(lahetettyRivi.pituus).toBeNull()
    expect(lahetettyRivi.paino).toBeNull()
  })

  it('jos syötteessä on id, se välitetään upsert-kutsuun (päivitys vs. uusi)', async () => {
    apurit.tila.singleTulos = {
      data: { id: 'olemassa-oleva-id' },
      error: null,
    }

    await tallennaAsiakas({
      id: 'olemassa-oleva-id',
      nimi: 'Päivitettävä',
      sahkoposti: 'paiv@example.com',
    })

    const lahetettyRivi = apurit.upsertVakooja.mock.calls[0][0]
    expect(lahetettyRivi.id).toBe('olemassa-oleva-id')
  })
})
