// AB-T7: Kuvantaminen-kenttätyypin smoke-testit.
// Tarkistetaan kaksi ydinkäyttäytymistä:
//   1. Ilman hoitokayntiId:tä komponentti näyttää ohjetta (ei yritä ladata datoja)
//   2. hoitokayntiId-prop kontekstista välittyy lapsille (AsentoKuvat / -Yhteenveto / AILoydosAnalyysi)
//
// Lapsikomponentit mokataan jotta vältetään raskaat moduulit (TF.js, supabase-haut).

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../../../services/supabase', () => ({ supabase: {} }))

vi.mock('../../../AsentoKuvat', () => ({
  default: ({ hoitokayntiId, asiakasId, asiakasPituusCm }) => (
    <div data-testid="asentokuvat-mock">
      AsentoKuvat hoitokayntiId={String(hoitokayntiId)}
      {' '}asiakasId={String(asiakasId)}
      {' '}pituus={String(asiakasPituusCm)}
    </div>
  ),
}))

vi.mock('../../../AsentoYhteenveto', () => ({
  default: ({ hoitokayntiId }) => (
    <div data-testid="asentoyhteenveto-mock">
      AsentoYhteenveto hoitokayntiId={String(hoitokayntiId)}
    </div>
  ),
}))

vi.mock('../../../AILoydosAnalyysi', () => ({
  default: ({ hoitokayntiId }) => (
    <div data-testid="ailoydos-mock">
      AILoydos hoitokayntiId={String(hoitokayntiId)}
    </div>
  ),
}))

import Kuvantaminen from './Kuvantaminen'
import { LomakeKontekstiProvider } from '../../../../lib/lomakeKonteksti'

describe('Kuvantaminen-kenttätyyppi (AB-T7)', () => {
  it('ilman hoitokayntiId:tä näyttää ohjeen eikä renderöi alikomponentteja', () => {
    render(
      <LomakeKontekstiProvider value={{ hoitokayntiId: null, asiakasId: null, asiakasPituusCm: null }}>
        <Kuvantaminen />
      </LomakeKontekstiProvider>
    )

    expect(screen.getByText(/käytettävissä kun käynti on luotu/i)).toBeInTheDocument()
    expect(screen.queryByTestId('asentokuvat-mock')).not.toBeInTheDocument()
    expect(screen.queryByTestId('asentoyhteenveto-mock')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ailoydos-mock')).not.toBeInTheDocument()
  })

  it('hoitokayntiId + asiakasId + asiakasPituusCm välittyvät kontekstista alikomponenteille', () => {
    render(
      <LomakeKontekstiProvider value={{ hoitokayntiId: 'h-123', asiakasId: 'a-456', asiakasPituusCm: 175 }}>
        <Kuvantaminen />
      </LomakeKontekstiProvider>
    )

    const asentokuvat = screen.getByTestId('asentokuvat-mock')
    expect(asentokuvat).toHaveTextContent('hoitokayntiId=h-123')
    expect(asentokuvat).toHaveTextContent('asiakasId=a-456')
    expect(asentokuvat).toHaveTextContent('pituus=175')

    expect(screen.getByTestId('asentoyhteenveto-mock')).toHaveTextContent('hoitokayntiId=h-123')
    expect(screen.getByTestId('ailoydos-mock')).toHaveTextContent('hoitokayntiId=h-123')
  })
})
