// BodymapHavainnot — runtime-kenttätyyppi hoitajan kehonkartta-havainnoille.
//
// Pala 2.4 (2026-05-05): MVP-vaihe — mock-näkymä joka näyttää rakenteen
// (3 välilehteä: Asiakkaan oireet | Hoitajan havainnot | Vertailu) sekä
// esikatselussa että oikeassa hoitokäynnissä. Toiminnallinen yhdistäminen
// olemassa olevaan KehonkarttaVertailu-komponenttiin tehdään seuraavassa
// palassa kun Hoitokirjaus.jsx → UusiKayntiContainer -reitti yhdistetään.
//
// Tällä mockilla hoitaja näkee jo lomake-editorissa miltä kenttä tulee
// näyttämään, ja voi rakentaa hoitaja-osion lomakkeeseen.

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

const valilehdetTyyli = {
  display:       'flex',
  gap:           '4px',
  borderBottom:  '2px solid #e5e7eb',
  marginBottom:  '12px',
}

const valilehtiTyyli = (aktiivinen) => ({
  padding:       '8px 14px',
  background:    aktiivinen ? '#fff' : 'transparent',
  borderBottom:  aktiivinen ? '2px solid #10b981' : '2px solid transparent',
  marginBottom:  '-2px',
  fontSize:      '13px',
  fontWeight:    aktiivinen ? 600 : 500,
  color:         aktiivinen ? '#065f46' : '#6b7280',
  cursor:        'default',
})

const sisaltoTyyli = {
  background:    '#f9fafb',
  border:        '1px solid #e5e7eb',
  borderRadius:  '8px',
  padding:       '20px',
  textAlign:     'center',
  color:         '#9ca3af',
  fontSize:      '13px',
  minHeight:     '120px',
  display:       'flex',
  alignItems:    'center',
  justifyContent: 'center',
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

export default function BodymapHavainnot() {
  const { hoitokayntiId } = useLomakeKonteksti()
  const onEsikatselu = !hoitokayntiId

  return (
    <div>
      {onEsikatselu && (
        <div style={esikatseluBannerTyyli}>
          Esikatselu — välilehdet ja kehonkartta latautuvat kun käynti on luotu
        </div>
      )}

      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Hoitajan kehonkartta ja havainnot</h3>

        <div style={valilehdetTyyli}>
          <div style={valilehtiTyyli(true)}>📍 Asiakkaan oireet</div>
          <div style={valilehtiTyyli(false)}>✏ Hoitajan havainnot</div>
          <div style={valilehtiTyyli(false)}>🔄 Vertailu</div>
        </div>

        <div style={sisaltoTyyli}>
          {onEsikatselu
            ? 'Asiakkaan kehonkartta-merkinnät A-lomakkeesta + kompakti yhteenveto'
            : 'Toiminnallisuus integroidaan seuraavassa palassa (KehonkarttaVertailu wrapper)'}
        </div>
      </div>
    </div>
  )
}
