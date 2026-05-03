import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mockaa db-moduuli — vain haePalvelut tarvitaan tähän komponenttiin
vi.mock('../lib/db', () => ({
  haePalvelut: vi.fn(),
}))

import { haePalvelut } from '../lib/db'
import HoitajanPalveluValinta from './HoitajanPalveluValinta'

describe('HoitajanPalveluValinta — modaali (AB-T5a)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ei renderöi mitään kun auki=false', () => {
    const { container } = render(
      <HoitajanPalveluValinta auki={false} onValitse={() => {}} onSulje={() => {}} />
    )
    expect(container).toBeEmptyDOMElement()
    // haePalvelut ei myöskään kutsuta jos modaali ei ole auki
    expect(haePalvelut).not.toHaveBeenCalled()
  })

  it('listaa vain aktiiviset palvelut joilla aktiivinen lomakepohja', async () => {
    haePalvelut.mockResolvedValue([
      { id: 'p1', nimi: 'Hieronta',     kuvaus: 'Klassinen', kesto_min: 60, hinta_eur: 75,
        aktiivinen: true,  lomakepohja_id: 'lp1', lomakepohja: { id: 'lp1', nimi: 'Hieronta-pohja', aktiivinen: true } },
      { id: 'p2', nimi: 'Jäsenkorjaus', kuvaus: null,        kesto_min: 90, hinta_eur: 120,
        aktiivinen: true,  lomakepohja_id: 'lp2', lomakepohja: { id: 'lp2', nimi: 'JK-pohja',       aktiivinen: true } },
      // Suodatuspois — palvelu ei aktiivinen
      { id: 'p3', nimi: 'Vanha palvelu',  aktiivinen: false, lomakepohja_id: 'lp3', lomakepohja: { aktiivinen: true } },
      // Suodatuspois — ei lomakepohjaa
      { id: 'p4', nimi: 'Ei pohjaa',      aktiivinen: true,  lomakepohja_id: null,  lomakepohja: null },
      // Suodatuspois — pohja ei aktiivinen
      { id: 'p5', nimi: 'Pohja kytketty pois', aktiivinen: true, lomakepohja_id: 'lp5', lomakepohja: { aktiivinen: false } },
    ])

    render(<HoitajanPalveluValinta auki={true} onValitse={() => {}} onSulje={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Hieronta')).toBeInTheDocument()
    })
    expect(screen.getByText('Jäsenkorjaus')).toBeInTheDocument()
    // Suodatetut eivät näy
    expect(screen.queryByText('Vanha palvelu')).not.toBeInTheDocument()
    expect(screen.queryByText('Ei pohjaa')).not.toBeInTheDocument()
    expect(screen.queryByText('Pohja kytketty pois')).not.toBeInTheDocument()

    // Rikas näkymä: kuvaus ja meta-info renderöityy kun saatavilla
    expect(screen.getByText('Klassinen')).toBeInTheDocument()
    expect(screen.getByText('60 min · 75 €')).toBeInTheDocument()
    expect(screen.getByText('90 min · 120 €')).toBeInTheDocument()
  })

  it('palvelun klikkaus kutsuu onValitse(palvelu) JA onSulje', async () => {
    const palvelu = {
      id: 'p1', nimi: 'Hieronta', kuvaus: null, kesto_min: 60, hinta_eur: 75,
      aktiivinen: true, lomakepohja_id: 'lp1', lomakepohja: { id: 'lp1', nimi: 'Hieronta-pohja', aktiivinen: true },
    }
    haePalvelut.mockResolvedValue([palvelu])

    const onValitse = vi.fn()
    const onSulje = vi.fn()

    render(<HoitajanPalveluValinta auki={true} onValitse={onValitse} onSulje={onSulje} />)

    await waitFor(() => screen.getByText('Hieronta'))

    // Etsi palvelukortin button (sisältää "Hieronta" + "Valitse →")
    const kortti = screen.getByRole('button', { name: /Hieronta.*Valitse/is })
    fireEvent.click(kortti)

    expect(onValitse).toHaveBeenCalledTimes(1)
    expect(onValitse).toHaveBeenCalledWith(palvelu)
    expect(onSulje).toHaveBeenCalledTimes(1)
  })

  it('näyttää tyhjä-tilan ohjeellisen viestin kun ei valittavia palveluita', async () => {
    haePalvelut.mockResolvedValue([])

    render(<HoitajanPalveluValinta auki={true} onValitse={() => {}} onSulje={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(/Ei valittavia palveluita/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Asetukset → Palvelut & lomakkeet/i)).toBeInTheDocument()
  })
})
