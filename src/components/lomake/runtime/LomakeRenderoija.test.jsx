import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mockaa supabase-clientti — useLomakepohja → db.js -ketju lataa sen vaikka
// käytämme valmiitTiedot-polkua (top-level createClient kaatuu env-puutteen takia).
vi.mock('../../../services/supabase', () => ({ supabase: {} }))

// LomakeRenderoija käyttää useLomakepohja-hookkia jos pohjaId annettu.
// Käytämme valmiitTiedot-polkua bypassaamaan DB ja keskittymään puhtaasti
// runtime-logiikkaan (uusiKayntiAloitettu + tyhjennys).

import LomakeRenderoija from './LomakeRenderoija'

const teeValmiitTiedot = (kentat, osiot) => ({
  rakenne: {
    formaatti_versio: 1,
    nayttotyyli:      'yksi_sivu',
    osiot,
  },
  kentat,
})

describe('LomakeRenderoija — Aloita uusi käynti tyhjentää muuttuvat (AB-T3b)', () => {
  it('klikkaus tyhjentää muuttuvat kentät, säilyttää pysyvät', async () => {
    const onMuutos = vi.fn()

    const valmiitTiedot = teeValmiitTiedot(
      {
        etunimi: { id: 'k1', tunniste: 'etunimi', tyyppi: 'tekstirivi', pysyva: true,  kaannokset: { fi: { otsikko: 'Etunimi' } } },
        kipu:    { id: 'k2', tunniste: 'kipu',    tyyppi: 'tekstirivi', pysyva: false, kaannokset: { fi: { otsikko: 'Kipu' } } },
      },
      [
        { id: 'o1', otsikko: 'Asiakas', rooli: 'asiakas', kenttat: [{ kentta_id_tunniste: 'etunimi' }] },
        { id: 'o2', otsikko: 'Hoitaja', rooli: 'hoitaja', kenttat: [{ kentta_id_tunniste: 'kipu' }]    },
      ]
    )

    render(
      <LomakeRenderoija
        valmiitTiedot={valmiitTiedot}
        vastaukset={{ etunimi: 'Sara', kipu: '5' }}
        onMuutos={onMuutos}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Aloita uusi käynti/i }))

    // useEffect tyhjennys ajetaan async — odota onMuutos-kutsua
    await waitFor(() => expect(onMuutos).toHaveBeenCalled())

    // onMuutos saa funktionaalisen päivityksen — kutsu se manuaalisesti
    // ja tarkista että vain pysyvät säilyvät
    const updaterFn = onMuutos.mock.calls[0][0]
    expect(typeof updaterFn).toBe('function')

    const tulos = updaterFn({ etunimi: 'Sara', kipu: '5' })
    expect(tulos).toEqual({ etunimi: 'Sara' })  // pysyvä säilyy
    expect(tulos.kipu).toBeUndefined()           // muuttuva poistettu
  })

  it('palauttaa tyhjän objektin jos kaikki kentät ovat muuttuvia', async () => {
    const onMuutos = vi.fn()

    const valmiitTiedot = teeValmiitTiedot(
      {
        kipu:    { id: 'k1', tunniste: 'kipu',    tyyppi: 'tekstirivi', pysyva: false, kaannokset: { fi: { otsikko: 'Kipu' } } },
        otsikko: { id: 'k2', tunniste: 'otsikko', tyyppi: 'tekstirivi', pysyva: false, kaannokset: { fi: { otsikko: 'Otsikko' } } },
      },
      [
        { id: 'o1', otsikko: 'Asiakas', rooli: 'asiakas', kenttat: [{ kentta_id_tunniste: 'kipu' }]    },
        { id: 'o2', otsikko: 'Hoitaja', rooli: 'hoitaja', kenttat: [{ kentta_id_tunniste: 'otsikko' }] },
      ]
    )

    render(
      <LomakeRenderoija
        valmiitTiedot={valmiitTiedot}
        vastaukset={{ kipu: '7', otsikko: 'Niska' }}
        onMuutos={onMuutos}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Aloita uusi käynti/i }))
    await waitFor(() => expect(onMuutos).toHaveBeenCalled())

    const tulos = onMuutos.mock.calls[0][0]({ kipu: '7', otsikko: 'Niska' })
    expect(tulos).toEqual({})
  })
})
