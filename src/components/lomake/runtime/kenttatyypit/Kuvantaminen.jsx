// AB-T7: Kuvantaminen — kenttätyyppi joka kokoaa Hoitokirjaus.jsx:n KA1-KA6 -palaset
// (asentokuvat + visuaalinen yhteenveto + AI-analyysi) yhdeksi lomake-kentäksi.
//
// Erikoisuudet:
//  - Tarvitsee hoitokayntiId + asiakasId + asiakasPituusCm — luetaan
//    LomakeKonteksti:sta (välitetty LomakeRenderoija:lta) prop-drilling sijaan.
//  - Ei tallenna omaa arvoa hoitokaynnit.vastaukset:iin — datat (kuvat, AI-loydot)
//    elävät omissa tauluissaan (asentokuvat, ai_loydos_analyysit).
//  - AI-analyysi tarvitsee havainnot/mittarit, mutta tässä kentässä emme näe niitä
//    (toiset osiot omistavat ne). Annetaan tyhjät defaultit — AILoydosAnalyysi
//    näyttää itsestään "Tee ensin havaintoja BodyMap:ssa." -ohjeen.
//  - Pala 2 (2026-05-05): hoitokayntiId puuttuessa (esikatselu) renderöityy mock-
//    näkymä — sama rakenne kuin oikealla, placeholder-sisältö, ei DB-kutsuja.
//    Hoitaja näkee esikatselussa miltä kenttä näyttää valmiina.

import { useLomakeKonteksti } from '../../../../lib/lomakeKonteksti'
import AsentoKuvat from '../../../AsentoKuvat'
import AsentoYhteenveto from '../../../AsentoYhteenveto'
import AILoydosAnalyysi from '../../../AILoydosAnalyysi'

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

// ─── Mock-tyylit esikatselua varten ─────────────────────────────────────────

const mockKuvariviTyyli = {
  display:             'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap:                 '8px',
  marginBottom:        '8px',
}

const mockKuvaPlaceholderTyyli = {
  background:    '#f3f4f6',
  border:        '1.5px dashed #d1d5db',
  borderRadius:  '10px',
  padding:       '24px 12px',
  textAlign:     'center',
  fontSize:      '13px',
  color:         '#6b7280',
  fontWeight:    500,
  display:       'flex',
  flexDirection: 'column',
  alignItems:    'center',
  gap:           '6px',
}

const mockOhjeTyyli = {
  fontSize:   '12px',
  color:      '#9ca3af',
  fontStyle:  'italic',
  margin:     '4px 0 0 0',
}

const mockYhteenvetoTyyli = {
  background:    '#f9fafb',
  border:        '1px solid #e5e7eb',
  borderRadius:  '8px',
  padding:       '20px',
  textAlign:     'center',
  color:         '#9ca3af',
  fontSize:      '13px',
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

function KuvantaminenEsikatselu() {
  const suunnat = ['Edestä', 'Sivulta vasemmalta', 'Takaa', 'Sivulta oikealta']
  return (
    <div>
      <div style={esikatseluBannerTyyli}>
        Esikatselu — varsinainen sisältö latautuu kun käynti on luotu
      </div>

      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Asentokuvat</h3>
        <div style={mockKuvariviTyyli}>
          {suunnat.map((suunta) => (
            <div key={suunta} style={mockKuvaPlaceholderTyyli}>
              <span style={{ fontSize: '24px' }}>📷</span>
              <span>{suunta}</span>
            </div>
          ))}
        </div>
        <p style={mockOhjeTyyli}>
          Hoitaja lataa neljä asentokuvaa käynnin aikana — kuvat tallentuvat
          automaattisesti ja avautuvat kalibrointityökaluun.
        </p>
      </div>

      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Yhteenveto</h3>
        <div style={mockYhteenvetoTyyli}>
          Asentopoikkeamien yhteenveto kuvista (kulmat, linjaukset)
        </div>
      </div>

      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>AI-analyysi</h3>
        <div style={mockYhteenvetoTyyli}>
          AI tunnistaa asentopoikkeamat ja ehdottaa hoitosuosituksia
          havaintojen + mittausten perusteella
        </div>
      </div>
    </div>
  )
}

// ─── Pää-komponentti ─────────────────────────────────────────────────────────

export default function Kuvantaminen() {
  const { hoitokayntiId, asiakasId, asiakasPituusCm } = useLomakeKonteksti()

  // Esikatselu (editori): ei oikeaa hoitokäyntiä → mock-näkymä joka näyttää
  // rakenteen ilman DB-kutsuja. Hoitaja näkee miltä kenttä näyttää valmiina.
  if (!hoitokayntiId) {
    return <KuvantaminenEsikatselu />
  }

  return (
    <div>
      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Asentokuvat</h3>
        <AsentoKuvat
          hoitokayntiId={hoitokayntiId}
          asiakasId={asiakasId}
          asiakasPituusCm={asiakasPituusCm}
        />
      </div>

      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Yhteenveto</h3>
        <AsentoYhteenveto hoitokayntiId={hoitokayntiId} />
      </div>

      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>AI-analyysi</h3>
        <AILoydosAnalyysi
          hoitokayntiId={hoitokayntiId}
          havainnot={[]}
          mittarit={null}
          edellisetMittarit={null}
          asiakkaanKehonkartta={null}
          asiakkaanOireet={null}
        />
      </div>
    </div>
  )
}
