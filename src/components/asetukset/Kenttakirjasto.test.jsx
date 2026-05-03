import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// Mock db-kerros — komponentti kutsuu vain kahta funktiota
vi.mock('../../lib/db', () => ({
  haeKenttakirjasto:    vi.fn(),
  paivitaKentanPysyvyys: vi.fn(),
}))

import { haeKenttakirjasto, paivitaKentanPysyvyys } from '../../lib/db'
import Kenttakirjasto from './Kenttakirjasto'

describe('Kenttakirjasto-komponentti', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderöityy ja näyttää listan kenttäkirjaston kentistä otsikolla, tyypillä ja tunnisteella', async () => {
    haeKenttakirjasto.mockResolvedValue([
      { id: 'k1', tunniste: 'etunimi',     tyyppi: 'tekstirivi',  otsikko: 'Etunimi',     pysyva: true  },
      { id: 'k2', tunniste: 'paivan_kipu', tyyppi: 'liukusaadin', otsikko: 'Päivän kipu', pysyva: false },
    ])

    render(<Kenttakirjasto />)

    // Lataus-tila näkyy ennen kuin promise resolvoituu
    expect(screen.getByText('Ladataan…')).toBeInTheDocument()

    // Lataus valmis → kentät näkyvät
    await waitFor(() => {
      expect(screen.getByText('Etunimi')).toBeInTheDocument()
    })
    expect(screen.getByText('Päivän kipu')).toBeInTheDocument()

    // Tyyppi + tunniste näkyy molemmille
    expect(screen.getByText(/Tekstirivi/)).toBeInTheDocument()
    expect(screen.getByText('etunimi')).toBeInTheDocument()
    expect(screen.getByText(/Liukusäädin/)).toBeInTheDocument()
    expect(screen.getByText('paivan_kipu')).toBeInTheDocument()

    // Pysyvällä kentällä näkyy 🔒 Pysyvä -lippu
    expect(screen.getByText(/🔒 Pysyvä/)).toBeInTheDocument()
  })

  it('checkboxin klikkaus kutsuu paivitaKentanPysyvyys oikealla argumentilla', async () => {
    haeKenttakirjasto.mockResolvedValue([
      { id: 'k1', tunniste: 'paivan_kipu', tyyppi: 'liukusaadin', otsikko: 'Päivän kipu', pysyva: false },
    ])
    paivitaKentanPysyvyys.mockResolvedValue({ virhe: null })

    render(<Kenttakirjasto />)

    // Odota lataus
    await waitFor(() => screen.getByText('Päivän kipu'))

    // Checkbox on ei-rastittu (kenttä on muuttuva)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    // Klikkaus → pitäisi kutsua paivitaKentanPysyvyys('k1', true)
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(paivitaKentanPysyvyys).toHaveBeenCalledWith('k1', true)
    })

    // Optimistinen päivitys → checkbox on heti rastitettu (DB-vastaus jo tullut mockissa)
    expect(checkbox).toBeChecked()
  })
})
