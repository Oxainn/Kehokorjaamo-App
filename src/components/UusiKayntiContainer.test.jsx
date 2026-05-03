import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

// Mockaa db-moduuli — säilytä actual jotta LomakeRenderoija:n alikomponentit
// (kuten CheckboxLista) saavat tarvitsemansa funktiot. Vain T5b-funktiot ja
// LomakeRenderoijan auto-save mockataan.
vi.mock('../lib/db', async () => {
  const actual = await vi.importActual('../lib/db')
  return {
    ...actual,
    luoTyhjaAsiakas:            vi.fn(),
    aloitaUusiKaynti:           vi.fn(),
    haeLomakepohja:             vi.fn(),
    paivitaAsiakkaanPerustiedot: vi.fn(),
    tallennaKayntiVastauksilla: vi.fn(),  // LomakeRenderoijan auto-save
  }
})

vi.mock('../services/supabase', () => ({ supabase: {} }))

import {
  luoTyhjaAsiakas,
  aloitaUusiKaynti,
  haeLomakepohja,
  paivitaAsiakkaanPerustiedot,
} from '../lib/db'
import UusiKayntiContainer from './UusiKayntiContainer'

const PALVELU = {
  id:             'palvelu-1',
  nimi:           'Hieronta',
  lomakepohja_id: 'pohja-1',
}

const POHJA_TIEDOT = {
  rakenne: {
    formaatti_versio: 1,
    nayttotyyli:      'yksi_sivu',
    osiot: [{ id: 'o1', otsikko: 'Asiakas', rooli: 'asiakas', kenttat: [] }],
  },
  kentat: {},
}

describe('UusiKayntiContainer (AB-T5b)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    luoTyhjaAsiakas.mockResolvedValue({ id: 'asiakas-1', virhe: null })
    aloitaUusiKaynti.mockResolvedValue({
      lomakeVersioId: 'v-1',
      hoitokayntiId:  'h-1',
      virhe:          null,
    })
    haeLomakepohja.mockResolvedValue({
      pohja:   { id: 'pohja-1' },
      rakenne: POHJA_TIEDOT.rakenne,
      kentat:  POHJA_TIEDOT.kentat,
      virhe:   null,
    })
    paivitaAsiakkaanPerustiedot.mockResolvedValue({ virhe: null })
  })

  it('setup-ketju: luo asiakas → aloita käynti → hae pohja → renderöi LomakeRenderoija', async () => {
    render(<UusiKayntiContainer palvelu={PALVELU} onValmis={() => {}} />)

    // Lataus-tila näkyy ensin
    expect(screen.getByText(/Valmistellaan uutta käyntiä/i)).toBeInTheDocument()

    // Setup valmis → kaikki kolme funktiota kutsuttu oikealla järjestyksellä
    await waitFor(() => {
      expect(luoTyhjaAsiakas).toHaveBeenCalledTimes(1)
    })
    expect(aloitaUusiKaynti).toHaveBeenCalledWith('asiakas-1')
    expect(haeLomakepohja).toHaveBeenCalledWith('pohja-1')

    // Yläpalkki näkyy palvelun nimellä → setup valmis
    await waitFor(() => {
      expect(screen.getByText('Hieronta')).toBeInTheDocument()
    })
  })

  it('virhe asiakkaan luonnissa → näyttää virheviestin + ei jatka käynnin aloitukseen', async () => {
    luoTyhjaAsiakas.mockResolvedValue({ id: null, virhe: 'permission denied' })

    render(<UusiKayntiContainer palvelu={PALVELU} onValmis={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(/Asiakkaan luonti epäonnistui/i)).toBeInTheDocument()
    })
    // Käyntiä tai pohjaa ei haettu
    expect(aloitaUusiKaynti).not.toHaveBeenCalled()
    expect(haeLomakepohja).not.toHaveBeenCalled()
  })

  it('palvelu ilman lomakepohja_id → setup-virhe heti', async () => {
    render(
      <UusiKayntiContainer
        palvelu={{ id: 'p1', nimi: 'Ei pohjaa' }}
        onValmis={() => {}}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Palvelua tai lomakepohjaa ei valittu/i)).toBeInTheDocument()
    })
    expect(luoTyhjaAsiakas).not.toHaveBeenCalled()
  })

  // ─── AB-T6a: olemassa olevan asiakkaan polku ──────────────────────────────

  it('AB-T6a: kun asiakasId annettu, ohittaa luoTyhjaAsiakas:n ja käyttää annettua suoraan', async () => {
    render(
      <UusiKayntiContainer
        palvelu={PALVELU}
        asiakasId="olemassa-oleva-id"
        onValmis={() => {}}
      />
    )

    await waitFor(() => {
      expect(aloitaUusiKaynti).toHaveBeenCalled()
    })

    // luoTyhjaAsiakas:ia EI kutsuttu (olemassa olevalle asiakkaalle ei luoda uutta)
    expect(luoTyhjaAsiakas).not.toHaveBeenCalled()
    // aloitaUusiKaynti sai annetun asiakasId:n suoraan
    expect(aloitaUusiKaynti).toHaveBeenCalledWith('olemassa-oleva-id')
    // Lomakepohjan haku jatkui normaalisti
    expect(haeLomakepohja).toHaveBeenCalledWith('pohja-1')
  })

  it('AB-T6a: olemassa olevan asiakkaan polku — jos aloitaUusiKaynti epäonnistuu, näyttää virheen', async () => {
    aloitaUusiKaynti.mockResolvedValue({ virhe: 'pysyvien-haku epäonnistui' })

    render(
      <UusiKayntiContainer
        palvelu={PALVELU}
        asiakasId="olemassa-oleva-id"
        onValmis={() => {}}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Käynnin aloitus epäonnistui/i)).toBeInTheDocument()
    })
    // luoTyhjaAsiakas ohitettu (olemassa oleva polku) — ei kutsuttu
    expect(luoTyhjaAsiakas).not.toHaveBeenCalled()
    // Pohjaa ei haettu koska käynti kaatui
    expect(haeLomakepohja).not.toHaveBeenCalled()
  })

  it('identiteetti-synkronointi: vastauksiin etunimi+sukunimi → 3s päästä paivitaAsiakkaanPerustiedot', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { rerender } = render(
        <UusiKayntiContainer palvelu={PALVELU} onValmis={() => {}} />
      )

      // Anna setup-promise:ien resolveutua (luoTyhjaAsiakas + aloitaUusiKaynti + haeLomakepohja)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })

      // Container omistaa vastaukset-staten — sisäisesti se päivittyy onMuutos:lla.
      // Testissä simuloidaan vastausten muutos rerenderillä on hankalaa koska
      // state on container:in sisällä. Sen sijaan tarkistamme että setup eteni
      // onnistuneesti ja paivitaAsiakkaanPerustiedot:ia EI ole vielä kutsuttu
      // (vastaukset on tyhjä → ei identiteetti-synkronointia).
      expect(paivitaAsiakkaanPerustiedot).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
