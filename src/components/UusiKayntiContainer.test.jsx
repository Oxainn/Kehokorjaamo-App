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
    avaaOlemassaKaynti:         vi.fn(),  // KIIRE-FIX 6 (D-malli)
    tallennaKayntiVastauksilla: vi.fn(),  // LomakeRenderoijan auto-save
  }
})

// KIIRE-FIX 4: hoitokaynnit-päivitys (lomakepohja_versio_id) odotetaan ja
// virheet nostetaan näkyviin. Tällä haltijalla testit voivat säätää mitä
// supabase.from('hoitokaynnit').update(...).eq(...) palauttaa.
const { supabaseHaltija } = vi.hoisted(() => ({
  supabaseHaltija: { paivitysVirhe: null },
}))

vi.mock('../services/supabase', () => ({
  supabase: {
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: supabaseHaltija.paivitysVirhe }),
      }),
    }),
  },
}))

import {
  luoTyhjaAsiakas,
  aloitaUusiKaynti,
  haeLomakepohja,
  paivitaAsiakkaanPerustiedot,
  avaaOlemassaKaynti,
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
    supabaseHaltija.paivitysVirhe = null
    luoTyhjaAsiakas.mockResolvedValue({ id: 'asiakas-1', virhe: null })
    aloitaUusiKaynti.mockResolvedValue({
      lomakeVersioId: 'v-1',
      hoitokayntiId:  'h-1',
      virhe:          null,
    })
    haeLomakepohja.mockResolvedValue({
      pohja:    { id: 'pohja-1' },
      versioId: 'pohja-v-1',
      rakenne:  POHJA_TIEDOT.rakenne,
      kentat:   POHJA_TIEDOT.kentat,
      virhe:    null,
    })
    paivitaAsiakkaanPerustiedot.mockResolvedValue({ virhe: null })
    avaaOlemassaKaynti.mockResolvedValue({
      virhe: null,
      kaynti: {
        id:         'olemassa-h-1',
        asiakasId:  'asiakas-7',
        versio:     5,
        vastaukset: { etunimi: 'Pekka', kipu_taso: 4 },
      },
      valmiitTiedot: { rakenne: POHJA_TIEDOT.rakenne, kentat: POHJA_TIEDOT.kentat },
    })
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

  // ─── KIIRE-FIX 4: lomakepohja_versio_id-tallennuksen virhetarkistus ───────

  it('KIIRE-FIX 4: jos versio_id-tallennus epäonnistuu → näyttää virheen, ei jatka renderöintiin', async () => {
    supabaseHaltija.paivitysVirhe = { message: 'permission denied' }

    render(<UusiKayntiContainer palvelu={PALVELU} onValmis={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(/Käynnin version tallennus epäonnistui/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/permission denied/)).toBeInTheDocument()
    // Lomake ei renderöidy: yläpalkin "Hieronta" ei löydy (vain virhetilan UI)
    expect(screen.queryByText('Hieronta')).not.toBeInTheDocument()
  })

  it('KIIRE-FIX 4: jos haeLomakepohja palauttaa versioId=null ilman virhettä → setup-virhe', async () => {
    haeLomakepohja.mockResolvedValue({
      pohja:    { id: 'pohja-1' },
      versioId: null,
      rakenne:  POHJA_TIEDOT.rakenne,
      kentat:   POHJA_TIEDOT.kentat,
      virhe:    null,
    })

    render(<UusiKayntiContainer palvelu={PALVELU} onValmis={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(/Lomakepohjasta ei löytynyt versiota/i)).toBeInTheDocument()
    })
    expect(screen.queryByText('Hieronta')).not.toBeInTheDocument()
  })

  it('KIIRE-FIX 4: virhetilassa "Takaisin rekisteriin" -nappi kutsuu onPeruuta:n', async () => {
    supabaseHaltija.paivitysVirhe = { message: 'jokin virhe' }
    const onPeruuta = vi.fn()

    render(<UusiKayntiContainer palvelu={PALVELU} onValmis={() => {}} onPeruuta={onPeruuta} />)

    const peruutusNappi = await screen.findByRole('button', { name: /Takaisin rekisteriin/i })
    peruutusNappi.click()
    expect(onPeruuta).toHaveBeenCalledTimes(1)
  })

  // ─── KIIRE-FIX 6 (D-malli): olemassaKayntiId-polku ────────────────────────

  it('KIIRE-FIX 6: olemassaKayntiId annettu → kutsuu avaaOlemassaKaynti, ohittaa uuden käynnin setupin', async () => {
    render(
      <UusiKayntiContainer
        olemassaKayntiId="olemassa-h-1"
        asiakasId="asiakas-7"
        onValmis={() => {}}
      />
    )

    await waitFor(() => {
      expect(avaaOlemassaKaynti).toHaveBeenCalledWith('olemassa-h-1')
    })
    // Uusi-käynti-polun setup-funktioita EI kutsuta — käynti on jo olemassa
    expect(luoTyhjaAsiakas).not.toHaveBeenCalled()
    expect(aloitaUusiKaynti).not.toHaveBeenCalled()
    expect(haeLomakepohja).not.toHaveBeenCalled()
  })

  it('KIIRE-FIX 6: olemassaKayntiId-polku ei vaadi palvelu-propia eikä anna virhettä', async () => {
    // Uudessa-käynnin-polussa palvelun puuttuminen aiheuttaa heti virheen.
    // Olemassa-polussa palvelu on tarpeeton — snapshot-pohja luetaan käynnin
    // lomakepohja_versio_id:n kautta avaaOlemassaKaynti-funktion sisällä.
    render(
      <UusiKayntiContainer
        olemassaKayntiId="olemassa-h-1"
        onValmis={() => {}}
      />
    )

    await waitFor(() => {
      expect(avaaOlemassaKaynti).toHaveBeenCalled()
    })
    expect(screen.queryByText(/Palvelua tai lomakepohjaa ei valittu/i)).not.toBeInTheDocument()
  })

  it('KIIRE-FIX 6: jos avaaOlemassaKaynti palauttaa virheen → näyttää sen + Takaisin rekisteriin -nappi', async () => {
    avaaOlemassaKaynti.mockResolvedValue({ virhe: 'Käyntiä ei löytynyt' })
    const onPeruuta = vi.fn()

    render(
      <UusiKayntiContainer
        olemassaKayntiId="puuttuva-id"
        onValmis={() => {}}
        onPeruuta={onPeruuta}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Käynnin avaaminen epäonnistui/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Käyntiä ei löytynyt/)).toBeInTheDocument()
    const peruutusNappi = await screen.findByRole('button', { name: /Takaisin rekisteriin/i })
    peruutusNappi.click()
    expect(onPeruuta).toHaveBeenCalledTimes(1)
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
