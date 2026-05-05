import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mockaa supabase-clientti — useLomakepohja → db.js -ketju lataa sen vaikka
// käytämme valmiitTiedot-polkua (top-level createClient kaatuu env-puutteen takia).
vi.mock('../../../services/supabase', () => ({ supabase: {} }))

// AB-T4b/c: mockaa vain T4-funktiot, säilytä muut (importOriginal).
// Muut renderöinnin alikomponentit (esim. CheckboxLista) importtaa db.js:stä
// eri funktioita — actual:in lataus pitää ne saatavilla.
vi.mock('../../../lib/db', async () => {
  const actual = await vi.importActual('../../../lib/db')
  return {
    ...actual,
    tallennaKayntiVastauksilla: vi.fn(),
    lukitseKaynti:              vi.fn(),
    avaaKayntiUudelleen:        vi.fn(),
  }
})

import { tallennaKayntiVastauksilla, lukitseKaynti, avaaKayntiUudelleen } from '../../../lib/db'

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

// KIIRE-FIX 3a (2026-05-05): nappi piilotettu UI:sta — testit skipataan
// kunnes oikea käyttäytyminen on määritelty. Kentän tyhjennys-logiikka
// (uusiKayntiAloitettu-tila, useEffect) jää LomakeRenderoija:han
// paikoilleen jotta nämä testit voidaan palauttaa muutettuna.
describe.skip('LomakeRenderoija — Aloita uusi käynti tyhjentää muuttuvat (AB-T3b)', () => {
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

describe('LomakeRenderoija — auto-save 3s debouncella (AB-T4b)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // KRIITTINEN: säilytä sama valmiitTiedot-referenssi yli rerenderin, jotta
  // LomakeRenderoija:n reset-useEffect (joka tarkkailee valmiitTiedot-prop)
  // ei nollaa ekaRenderRef:iä → muuten auto-save skipataan ekana ajona.
  const POHJA_REFERENSSI = teeValmiitTiedot(
    {},
    [{ id: 'o1', otsikko: 'Asiakas', rooli: 'asiakas', kenttat: [] }]
  )

  it('hoitokayntiId puuttuu → ei auto-savea vaikka vastaukset muuttuu', async () => {
    const { rerender } = render(
      <LomakeRenderoija
        valmiitTiedot={POHJA_REFERENSSI}
        vastaukset={{ a: 1 }}
        onMuutos={() => {}}
      />
    )
    rerender(
      <LomakeRenderoija
        valmiitTiedot={POHJA_REFERENSSI}
        vastaukset={{ a: 2 }}
        onMuutos={() => {}}
      />
    )
    await vi.advanceTimersByTimeAsync(5000)
    expect(tallennaKayntiVastauksilla).not.toHaveBeenCalled()
  })

  it('vastaukset-muutos triggeröi auto-saven 3s viiveen jälkeen, ei aikaisemmin', async () => {
    tallennaKayntiVastauksilla.mockResolvedValue({ virhe: null, versio: 1 })

    const { rerender } = render(
      <LomakeRenderoija
        hoitokayntiId="h1"
        valmiitTiedot={POHJA_REFERENSSI}
        vastaukset={{ a: 1 }}
        onMuutos={() => {}}
      />
    )

    // Initial render: ei tallennusta (ekaRenderRef skip)
    await vi.advanceTimersByTimeAsync(5000)
    expect(tallennaKayntiVastauksilla).not.toHaveBeenCalled()

    // vastaukset muuttuu
    rerender(
      <LomakeRenderoija
        hoitokayntiId="h1"
        valmiitTiedot={POHJA_REFERENSSI}
        vastaukset={{ a: 2 }}
        onMuutos={() => {}}
      />
    )

    // Ennen 3s: ei kutsuttu
    await vi.advanceTimersByTimeAsync(2500)
    expect(tallennaKayntiVastauksilla).not.toHaveBeenCalled()

    // 3s täyttyy → kutsuttu
    await vi.advanceTimersByTimeAsync(500)
    expect(tallennaKayntiVastauksilla).toHaveBeenCalledTimes(1)
    expect(tallennaKayntiVastauksilla).toHaveBeenCalledWith('h1', { a: 2 }, null)
  })

  it('onnistunut tallennus näyttää "Tallennettu" -indikaattorin', async () => {
    tallennaKayntiVastauksilla.mockResolvedValue({ virhe: null, versio: 5 })

    const { rerender } = render(
      <LomakeRenderoija
        hoitokayntiId="h1"
        alkuVersio={4}
        valmiitTiedot={POHJA_REFERENSSI}
        vastaukset={{ a: 1 }}
        onMuutos={() => {}}
      />
    )

    rerender(
      <LomakeRenderoija
        hoitokayntiId="h1"
        alkuVersio={4}
        valmiitTiedot={POHJA_REFERENSSI}
        vastaukset={{ a: 2 }}
        onMuutos={() => {}}
      />
    )

    // act-wrapper: advanceTimersByTime + microtask-flush jotta async tallennus
    // ehtii valmistua + Reactin state-päivitykset näkyä DOMissa
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(screen.getByText(/Tallennettu klo/i)).toBeInTheDocument()
    // alkuVersio välittyi DB-kutsuun
    expect(tallennaKayntiVastauksilla).toHaveBeenCalledWith('h1', { a: 2 }, 4)
  })

  it('verkkovirhe → näyttää virhe-indikaattorin + retry-napin', async () => {
    tallennaKayntiVastauksilla.mockResolvedValue({ virhe: 'verkkovirhe' })

    const { rerender } = render(
      <LomakeRenderoija
        hoitokayntiId="h1"
        valmiitTiedot={POHJA_REFERENSSI}
        vastaukset={{ a: 1 }}
        onMuutos={() => {}}
      />
    )
    rerender(
      <LomakeRenderoija
        hoitokayntiId="h1"
        valmiitTiedot={POHJA_REFERENSSI}
        vastaukset={{ a: 2 }}
        onMuutos={() => {}}
      />
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(screen.getByText(/Tallennus epäonnistui/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Yritä nyt/i })).toBeInTheDocument()
  })

  it('optimistinen lukon ristiriita → näyttää modaalin', async () => {
    tallennaKayntiVastauksilla.mockResolvedValue({
      ristiriita:     true,
      nykyinenVersio: 7,
      virhe:          'Käynti on muokattu toisessa ikkunassa',
    })

    const { rerender } = render(
      <LomakeRenderoija
        hoitokayntiId="h1"
        alkuVersio={3}
        valmiitTiedot={POHJA_REFERENSSI}
        vastaukset={{ a: 1 }}
        onMuutos={() => {}}
      />
    )
    rerender(
      <LomakeRenderoija
        hoitokayntiId="h1"
        alkuVersio={3}
        valmiitTiedot={POHJA_REFERENSSI}
        vastaukset={{ a: 2 }}
        onMuutos={() => {}}
      />
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/muokattu toisessa ikkunassa/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Päivitä sivu/i })).toBeInTheDocument()
  })
})

describe('LomakeRenderoija — Tallenna käynti -nappi + lukutila + Avaa muokattavaksi (AB-T4c)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const POHJA = teeValmiitTiedot(
    {},
    [{ id: 'o1', otsikko: 'Asiakas', rooli: 'asiakas', kenttat: [] }]
  )

  it('"Tallenna käynti" -nappi näkyy luonnos-tilassa kun hoitokayntiId asetettu', () => {
    render(
      <LomakeRenderoija
        hoitokayntiId="h1"
        valmiitTiedot={POHJA}
        vastaukset={{}}
        onMuutos={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: /Tallenna käynti/i })).toBeInTheDocument()
    // Lukutila-lippua ei näy
    expect(screen.queryByText(/lukittu/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Avaa muokattavaksi/i })).not.toBeInTheDocument()
  })

  it('"Tallenna käynti" -klikkaus avaa lukitusmodaalin', () => {
    render(
      <LomakeRenderoija
        hoitokayntiId="h1"
        valmiitTiedot={POHJA}
        vastaukset={{}}
        onMuutos={() => {}}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Tallenna käynti/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Tallenna ja lukitse käynti/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Tallenna ja lukitse$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Peruuta/i })).toBeInTheDocument()
  })

  it('lukitusmodaalin vahvistus kutsuu lukitseKaynti + onTilaMuutos("valmis")', async () => {
    lukitseKaynti.mockResolvedValue({ virhe: null, versio: 5 })
    const onTilaMuutos = vi.fn()

    render(
      <LomakeRenderoija
        hoitokayntiId="h1"
        alkuVersio={4}
        valmiitTiedot={POHJA}
        vastaukset={{ a: 1 }}
        onMuutos={() => {}}
        onTilaMuutos={onTilaMuutos}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Tallenna käynti/i }))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Tallenna ja lukitse$/i }))
    })

    expect(lukitseKaynti).toHaveBeenCalledWith('h1', 4)
    expect(onTilaMuutos).toHaveBeenCalledWith('valmis')
  })

  it('lukutila (tila="valmis"): lukutila-lippu + "Avaa muokattavaksi" -nappi näkyy, "Tallenna käynti" piilossa', () => {
    render(
      <LomakeRenderoija
        hoitokayntiId="h1"
        valmiitTiedot={POHJA}
        vastaukset={{}}
        onMuutos={() => {}}
        tila="valmis"
      />
    )

    expect(screen.getByText(/Käynti tallennettu \(lukittu\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Avaa muokattavaksi/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Tallenna käynti$/i })).not.toBeInTheDocument()
  })

  it('"Avaa muokattavaksi" -modaalin vahvistus kutsuu avaaKayntiUudelleen + onTilaMuutos("luonnos")', async () => {
    avaaKayntiUudelleen.mockResolvedValue({ virhe: null, avattuKerralla: 1 })
    const onTilaMuutos = vi.fn()

    render(
      <LomakeRenderoija
        hoitokayntiId="h1"
        valmiitTiedot={POHJA}
        vastaukset={{}}
        onMuutos={() => {}}
        tila="valmis"
        onTilaMuutos={onTilaMuutos}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Avaa muokattavaksi/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Avaa muokattavaksi$/i }))
    })

    expect(avaaKayntiUudelleen).toHaveBeenCalledWith('h1')
    expect(onTilaMuutos).toHaveBeenCalledWith('luonnos')
  })

  it('lukutilassa Naytto-wrapperi disabloitu (aria-disabled)', () => {
    const { container } = render(
      <LomakeRenderoija
        hoitokayntiId="h1"
        valmiitTiedot={POHJA}
        vastaukset={{}}
        onMuutos={() => {}}
        tila="valmis"
      />
    )

    // aria-disabled wrapper on Naytto:n ympärillä
    const disabled = container.querySelector('[aria-disabled="true"]')
    expect(disabled).toBeInTheDocument()
    // CSS pointer-events: none + opacity 0.7
    expect(disabled.style.pointerEvents).toBe('none')
  })
})
