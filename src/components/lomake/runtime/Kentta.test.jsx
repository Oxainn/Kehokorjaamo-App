import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Kenttätyyppien import-ketju voi koskea supabase-clienttiä — mokkaa moduuli
// jotta top-level createClient ei kaadu testiympäristössä (env puuttuu).
vi.mock('../../../services/supabase', () => ({ supabase: {} }))

import Kentta from './Kentta'

const teeKentta = (overrides = {}) => ({
  id:         'k1',
  tunniste:   'esim',
  tyyppi:     'tekstirivi',
  validointi: {},
  oletukset:  {},
  kaannokset: { fi: { otsikko: 'Esimerkki' } },
  pysyva:     false,
  ...overrides,
})

describe('Kentta — pysyvyys-merkki labelissa (AB-T3b)', () => {
  it('näyttää 🔒-merkin labelin perässä kun kentta.pysyva === true', () => {
    render(
      <Kentta
        kentta={teeKentta({ pysyva: true })}
        kenttamerkinta={{ kentta_id_tunniste: 'esim' }}
        arvo=""
        onMuutos={() => {}}
      />
    )

    expect(screen.getByText('🔒')).toBeInTheDocument()
    // Tooltip on title-attribuutissa
    expect(screen.getByTitle(/Pysyvä kenttä/i)).toBeInTheDocument()
  })

  it('ei näytä 🔒-merkkiä kun kentta.pysyva === false', () => {
    render(
      <Kentta
        kentta={teeKentta({ pysyva: false })}
        kenttamerkinta={{ kentta_id_tunniste: 'esim' }}
        arvo=""
        onMuutos={() => {}}
      />
    )

    expect(screen.queryByText('🔒')).not.toBeInTheDocument()
    expect(screen.queryByTitle(/Pysyvä kenttä/i)).not.toBeInTheDocument()
  })
})
