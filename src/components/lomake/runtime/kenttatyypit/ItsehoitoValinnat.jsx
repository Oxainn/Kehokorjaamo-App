// ItsehoitoValinnat — runtime-kenttätyyppi hoitajan valitsemille itsehoito-
// harjoituksille käyntiä varten.
//
// Pala 2.5 (2026-05-05): MVP-vaihe — mock-näkymä. Toiminnallinen kytkentä
// olemassa olevaan ItsehoitoValinnat-komponenttiin tehdään seuraavassa palassa.
//
// Tallennusmalli (suunnitelma): arvo = valinnat-array vastaukset-jsonbissa.
//   [{ kirjasto_harjoitus_id, toistot_muokattu, frekvenssi_muokattu, lisahuomautus, jarjestys }]

import { useLomakeKonteksti } from '../../../../lib/lomakeKonteksti'

const ryhmaTyyli = {
  background:    '#fff',
  border:        '1px solid #e5e7eb',
  borderRadius:  '12px',
  padding:       '16px',
  marginBottom:  '12px',
}

const ryhmaOtsikko = {
  fontSize:      '14px',
  fontWeight:    '700',
  color:         '#1f2937',
  margin:        '0 0 12px 0',
}

const harjoitusKortti = {
  background:    '#f9fafb',
  border:        '1.5px dashed #cbd5e1',
  borderRadius:  '10px',
  padding:       '14px',
  marginBottom:  '8px',
  display:       'flex',
  alignItems:    'center',
  gap:           '12px',
}

const harjoitusKuvake = {
  fontSize:      '24px',
  width:         '40px',
  textAlign:     'center',
  flexShrink:    0,
}

const harjoitusTeksti = {
  flex:          1,
  fontSize:      '13px',
  color:         '#6b7280',
}

const lisaaNappi = {
  width:         '100%',
  padding:       '12px',
  borderRadius:  '12px',
  border:        '1.5px dashed #cbd5e1',
  background:    'transparent',
  color:         '#10b981',
  fontSize:      '14px',
  fontWeight:    600,
  cursor:        'default',
  marginTop:     '8px',
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

export default function ItsehoitoValinnat() {
  const { hoitokayntiId } = useLomakeKonteksti()
  const onEsikatselu = !hoitokayntiId

  return (
    <div>
      {onEsikatselu && (
        <div style={esikatseluBannerTyyli}>
          Esikatselu — itsehoito-kirjasto avautuu kun käynti on luotu
        </div>
      )}

      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Käyntikohtainen itsehoito-ohjelma</h3>

        <div style={harjoitusKortti}>
          <div style={harjoitusKuvake}>🧘</div>
          <div style={harjoitusTeksti}>
            Harjoitus 1 — toistot ja frekvenssi muokattavissa
          </div>
        </div>

        <div style={harjoitusKortti}>
          <div style={harjoitusKuvake}>🤸</div>
          <div style={harjoitusTeksti}>
            Harjoitus 2 — älykäs suodatus käynnin havaintojen mukaan
          </div>
        </div>

        <button type="button" style={lisaaNappi} disabled>
          + Lisää itsehoito kirjastosta
        </button>
      </div>
    </div>
  )
}
