// AILoydosAnalyysi — runtime-kenttätyyppi AI:n löydösanalyysiä varten.
//
// Pala 2.6 (2026-05-05): MVP-vaihe — mock-näkymä. Toiminnallinen kytkentä
// olemassa olevaan AILoydosAnalyysi-komponenttiin (joka kutsuu Edge Functionia)
// tehdään seuraavassa palassa.
//
// AI-pyyntö tarvitsee: hoitokayntiId, havainnot, mittarit, edellisetMittarit,
// asiakkaanKehonkartta, asiakkaanOireet — nämä haetaan kontekstista tai
// käynnin yhteydestä kun integroidaan oikea logiikka.

import { useLomakeKonteksti } from '../../../../lib/lomakeKonteksti'

const lohkoTyyli = {
  background:    '#faf5ff',
  border:        '1.5px solid #e9d5ff',
  borderRadius:  '12px',
  padding:       '16px 18px',
  display:       'flex',
  flexDirection: 'column',
  gap:           '10px',
}

const otsikkoTyyli = {
  fontSize:      '15px',
  fontWeight:    700,
  color:         '#6b21a8',
  margin:        0,
  display:       'flex',
  alignItems:    'center',
  gap:           '8px',
}

const ohjeTyyli = {
  fontSize:      '13px',
  color:         '#7c3aed',
  margin:        0,
  lineHeight:    1.5,
}

const nappiMockTyyli = {
  alignSelf:     'flex-start',
  padding:       '8px 14px',
  background:    '#a855f7',
  color:         'white',
  border:        'none',
  borderRadius:  '8px',
  fontSize:      '13px',
  fontWeight:    600,
  cursor:        'default',
  opacity:       0.7,
}

const kvootitTyyli = {
  fontSize:      '11px',
  color:         '#9333ea',
  marginTop:     '4px',
}

const esikatseluBannerTyyli = {
  background:    '#eff6ff',
  border:        '1px solid #bfdbfe',
  borderRadius:  '8px',
  padding:       '8px 12px',
  fontSize:      '12px',
  color:         '#1e40af',
  marginBottom:  '12px',
  textAlign:     'center',
  fontWeight:    500,
}

export default function AILoydosAnalyysi() {
  const { hoitokayntiId } = useLomakeKonteksti()
  const onEsikatselu = !hoitokayntiId

  return (
    <div>
      {onEsikatselu && (
        <div style={esikatseluBannerTyyli}>
          Esikatselu — AI-analyysi käynnistyy hoitokäynnissä
        </div>
      )}

      <div style={lohkoTyyli}>
        <h3 style={otsikkoTyyli}>
          <span>🤖</span>
          <span>AI-analyysi löydöksistä</span>
        </h3>
        <p style={ohjeTyyli}>
          Anthropic Claude analysoi hoitajan BodyMap-havainnot ja mittarit
          ja antaa tulkinnan + jatkohoitoehdotuksia. Tarvitsee vähintään
          1 havainnon tai mittauksen.
        </p>
        <button type="button" style={nappiMockTyyli} disabled>
          ▶ Pyydä AI-analyysi
        </button>
        <p style={kvootitTyyli}>
          Kvootti: 30 / tunti, 200 / vuorokausi (rajoitus per hoitaja)
        </p>
      </div>
    </div>
  )
}
