import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mokkaa Osio-komponentti yksinkertaiseksi divillä — tämä testi keskittyy
// vain rooli-erotteluun, ei kenttien renderöintiin.
vi.mock('../Osio', () => ({
  default: ({ osio }) => {
    const otsikko = typeof osio.otsikko === 'object' ? osio.otsikko.fi : osio.otsikko
    return <div data-testid={`osio-${osio.id}`}>{otsikko}</div>
  },
}))

import NayttoYksiSivu from './NayttoYksiSivu'

const teePohja = (osiot) => ({
  formaatti_versio: 1,
  nayttotyyli: 'yksi_sivu',
  osiot: osiot.map((o, i) => ({ jarjestys: i + 1, kenttat: [], ...o })),
})

describe('NayttoYksiSivu — rooli-erottelu (AB-T2c)', () => {
  it('renderöi roolitransitio-otsikon kun osio vaihtuu asiakkaasta hoitajaan', () => {
    const rakenne = teePohja([
      { id: 'o1', otsikko: 'Asiakkaan perustiedot', rooli: 'asiakas' },
      { id: 'o2', otsikko: 'Asiakkaan oireet',      rooli: 'asiakas' },
      { id: 'o3', otsikko: 'Hoitajan havainnot',    rooli: 'hoitaja' },
      { id: 'o4', otsikko: 'Hoitajan mittaukset',   rooli: 'hoitaja' },
    ])

    render(
      <NayttoYksiSivu
        rakenne={rakenne}
        kentat={{}}
        vastaukset={{}}
        virheet={{}}
        onKenttamuutos={() => {}}
      />
    )

    // Kaikki neljä osiota renderöityvät
    expect(screen.getByTestId('osio-o1')).toBeInTheDocument()
    expect(screen.getByTestId('osio-o4')).toBeInTheDocument()

    // Roolitransitio-otsikko näytetään vain kerran (asiakas → hoitaja kohdassa)
    const transitiot = screen.getAllByText(/Hoitajan kirjaukset/i)
    expect(transitiot).toHaveLength(1)

    // Asiakkaan-osioilla ei ennen-otsikkoa (lomake alkaa asiakkaalla, ei vaihtuu)
    expect(screen.queryByText(/Asiakkaan kirjaukset/i)).not.toBeInTheDocument()
  })

  it('ei roolitransitio-otsikkoa kun kaikki osiot ovat samaa roolia', () => {
    const rakenne = teePohja([
      { id: 'o1', otsikko: 'Eka',  rooli: 'asiakas' },
      { id: 'o2', otsikko: 'Toka', rooli: 'asiakas' },
      { id: 'o3', otsikko: 'Kolmas' /* ei roolia → default 'asiakas' lisaaTransitiot:ssa */ },
    ])

    render(
      <NayttoYksiSivu
        rakenne={rakenne}
        kentat={{}}
        vastaukset={{}}
        virheet={{}}
        onKenttamuutos={() => {}}
      />
    )

    expect(screen.queryByText(/Hoitajan kirjaukset/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Asiakkaan kirjaukset/i)).not.toBeInTheDocument()
    // Mutta osiot renderöityvät silti
    expect(screen.getByTestId('osio-o1')).toBeInTheDocument()
    expect(screen.getByTestId('osio-o3')).toBeInTheDocument()
  })
})

describe('NayttoYksiSivu — Aloita uusi käynti -nappi (AB-T3a)', () => {
  it('näyttää napin asiakkaan ja hoitajan osioiden välissä', () => {
    const rakenne = teePohja([
      { id: 'o1', otsikko: 'Asiakas', rooli: 'asiakas' },
      { id: 'o2', otsikko: 'Hoitaja', rooli: 'hoitaja' },
    ])

    render(
      <NayttoYksiSivu
        rakenne={rakenne}
        kentat={{}}
        vastaukset={{}}
        virheet={{}}
        onKenttamuutos={() => {}}
        uusiKayntiAloitettu={false}
        onAloitaUusiKaynti={() => {}}
      />
    )

    // Iso "ALOITA UUSI KÄYNTI" -nappi näkyy
    const nappi = screen.getByRole('button', { name: /Aloita uusi käynti/i })
    expect(nappi).toBeInTheDocument()
    // Info-tilaa ei näy ennen klikkausta
    expect(screen.queryByText(/Käynti aloitettu/i)).not.toBeInTheDocument()
  })

  it('aloitettu-tilassa näkyy infoteksti, ei nappia', () => {
    const rakenne = teePohja([
      { id: 'o1', otsikko: 'Asiakas', rooli: 'asiakas' },
      { id: 'o2', otsikko: 'Hoitaja', rooli: 'hoitaja' },
    ])

    render(
      <NayttoYksiSivu
        rakenne={rakenne}
        kentat={{}}
        vastaukset={{}}
        virheet={{}}
        onKenttamuutos={() => {}}
        uusiKayntiAloitettu={true}
        onAloitaUusiKaynti={() => {}}
      />
    )

    expect(screen.queryByRole('button', { name: /Aloita uusi käynti/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Käynti aloitettu/i)).toBeInTheDocument()
  })

  it('napin klikkaus kutsuu onAloitaUusiKaynti-callbackia', () => {
    const onAloita = vi.fn()
    const rakenne = teePohja([
      { id: 'o1', otsikko: 'Asiakas', rooli: 'asiakas' },
      { id: 'o2', otsikko: 'Hoitaja', rooli: 'hoitaja' },
    ])

    render(
      <NayttoYksiSivu
        rakenne={rakenne}
        kentat={{}}
        vastaukset={{}}
        virheet={{}}
        onKenttamuutos={() => {}}
        uusiKayntiAloitettu={false}
        onAloitaUusiKaynti={onAloita}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Aloita uusi käynti/i }))
    expect(onAloita).toHaveBeenCalledTimes(1)
  })

  it('lomake jossa on vain asiakas-osioita → ei nappia näy', () => {
    const rakenne = teePohja([
      { id: 'o1', otsikko: 'Asiakas 1', rooli: 'asiakas' },
      { id: 'o2', otsikko: 'Asiakas 2', rooli: 'asiakas' },
    ])

    render(
      <NayttoYksiSivu
        rakenne={rakenne}
        kentat={{}}
        vastaukset={{}}
        virheet={{}}
        onKenttamuutos={() => {}}
        uusiKayntiAloitettu={false}
        onAloitaUusiKaynti={() => {}}
      />
    )

    expect(screen.queryByRole('button', { name: /Aloita uusi käynti/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Käynti aloitettu/i)).not.toBeInTheDocument()
  })
})
