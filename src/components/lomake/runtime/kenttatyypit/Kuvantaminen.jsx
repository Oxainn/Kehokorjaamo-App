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
//  - Jos hoitokayntiId puuttuu (esim. esikatselu), näytetään ohje eikä yritetä
//    ladata asentokuva-komponentteja (vältetään turhia tietokanta-kutsuja).

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

const ohjeTyyli = {
  fontSize:      '13px',
  color:         '#6b7280',
  fontStyle:     'italic',
  padding:       '16px',
  background:    '#f9fafb',
  border:        '1px dashed #e5e7eb',
  borderRadius:  '12px',
  textAlign:     'center',
}

export default function Kuvantaminen() {
  const { hoitokayntiId, asiakasId, asiakasPituusCm } = useLomakeKonteksti()

  if (!hoitokayntiId) {
    return (
      <div style={ohjeTyyli}>
        Asentokuvat ja AI-analyysi ovat käytettävissä kun käynti on luotu.
      </div>
    )
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
