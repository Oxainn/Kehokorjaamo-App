// EdellisenKaynninMuista — runtime-kenttätyyppi joka näyttää read-only nostona
// asiakkaan edellisen valmiin käynnin "Muista ensi kerralla" -tekstin.
//
// Pala 2.7 (2026-05-05): MVP-vaihe — mock-näkymä. Toiminnallinen kytkentä
// (haeEdellinenValmiisKaynti → muista_ensi_kerralla) tehdään seuraavassa palassa
// kun Hoitokirjaus.jsx-reitti integroidaan.
//
// Read-only: ei tallenna mitään käynnin vastaukset-jsonbiin. Vain näyttää.

import { useLomakeKonteksti } from '../../../../lib/lomakeKonteksti'

const lohkoTyyli = {
  background:    '#fef3c7',
  border:        '1.5px solid #fde68a',
  borderRadius:  '12px',
  padding:       '14px 16px',
  display:       'flex',
  flexDirection: 'column',
  gap:           '8px',
}

const otsikkoTyyli = {
  fontSize:      '13px',
  fontWeight:    700,
  color:         '#92400e',
  margin:        0,
  display:       'flex',
  alignItems:    'center',
  gap:           '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const tekstiTyyli = {
  fontSize:      '14px',
  color:         '#78350f',
  lineHeight:    1.5,
  fontStyle:     'italic',
  margin:        0,
}

const tyhjaTyyli = {
  fontSize:      '13px',
  color:         '#a16207',
  fontStyle:     'italic',
  margin:        0,
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

export default function EdellisenKaynninMuista() {
  const { hoitokayntiId } = useLomakeKonteksti()
  const onEsikatselu = !hoitokayntiId

  return (
    <div>
      {onEsikatselu && (
        <div style={esikatseluBannerTyyli}>
          Esikatselu — edellisen käynnin "Muista" -nosto näkyy hoitokäynnissä
        </div>
      )}

      <div style={lohkoTyyli}>
        <h4 style={otsikkoTyyli}>
          <span>📌</span>
          <span>Edellisellä käynnillä tehty huomio</span>
        </h4>
        {onEsikatselu ? (
          <p style={tekstiTyyli}>
            "Esimerkki: Tarkista lantion sivuttainen kallistus ja
            ohjeista jalkaterän asentoa juostessa."
          </p>
        ) : (
          <p style={tyhjaTyyli}>
            Toiminnallisuus integroidaan seuraavassa palassa
            (haeEdellinenValmiisKaynti → muista_ensi_kerralla)
          </p>
        )}
      </div>
    </div>
  )
}
