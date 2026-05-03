// AB-T2c: visuaalinen erottelu lomake-runtimessa asiakkaan ja hoitajan
// osioiden välillä. Kolme näyttötyyliä jakavat saman apurin.
//
// Värit yhdenmukaiset LomakepohjaEditorin kanssa:
//   asiakas → sininen (#93c5fd / blue-300)
//   hoitaja → vihreä (#6ee7b7 / emerald-300)

const tyylit = {
  container: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
    margin:     '8px 0',
  },
  viiva: (rooli) => ({
    flex:       1,
    height:     '1px',
    background: rooli === 'hoitaja' ? '#a7f3d0' : '#bfdbfe',
  }),
  teksti: (rooli) => ({
    fontSize:      '11px',
    fontWeight:    '700',
    color:         rooli === 'hoitaja' ? '#065f46' : '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    whiteSpace:    'nowrap',
  }),
}

export function RoolitransitioOtsikko({ rooli }) {
  const teksti = rooli === 'hoitaja' ? 'Hoitajan kirjaukset' : 'Asiakkaan kirjaukset'
  return (
    <div style={tyylit.container} role="separator">
      <div style={tyylit.viiva(rooli)} />
      <span style={tyylit.teksti(rooli)}>{teksti}</span>
      <div style={tyylit.viiva(rooli)} />
    </div>
  )
}

// Vasen reuna osion containerille — käytetään kaikissa kolmessa näyttötyylissä.
// Spread-muoto sopii sekä uuteen style-objektiin että olemassa olevaan tyyliin.
export const osionReunaTyyli = (rooli) => ({
  borderLeft: rooli === 'hoitaja' ? '4px solid #6ee7b7' : '4px solid #93c5fd',
})

// Pieni rooli-tunniste otsikon alle (NayttoCKerrallaan käyttää, koska siellä
// näkyy yksi osio kerrallaan eikä transitio-otsikko ole luonnollinen).
export const RooliTunniste = ({ rooli }) => {
  const teksti = rooli === 'hoitaja' ? 'Hoitajan osio' : 'Asiakkaan osio'
  const vari   = rooli === 'hoitaja' ? '#065f46'      : '#1e40af'
  return (
    <p style={{
      fontSize:      '11px',
      fontWeight:    '600',
      color:         vari,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      margin:        '2px 0 0 0',
    }}>
      {teksti}
    </p>
  )
}

// Käy osio-listan läpi ja päättele mitkä tarvitsevat roolitransitio-otsikkoa
// ennen itseään. Otsikko näytetään kun rooli vaihtuu edellisestä osiosta.
// Palauttaa: [{ osio, naytaTransitio: boolean }]
export function lisaaTransitiot(osiot) {
  let edellinenRooli = null
  return osiot.map((osio) => {
    const rooli = osio.rooli === 'hoitaja' ? 'hoitaja' : 'asiakas'
    const naytaTransitio = edellinenRooli !== null && edellinenRooli !== rooli
    edellinenRooli = rooli
    return { osio, naytaTransitio, rooli }
  })
}

// Etsi ensimmäisen hoitaja-osion indeksi joka tulee asiakas-osion JÄLKEEN.
// Palauttaa -1 jos selvää transitiota ei löydy (vain asiakas, vain hoitaja,
// tai hoitaja ennen ensimmäistä asiakasta).
//
// Käytetään AB-T3a:ssa "Aloita uusi käynti" -napin sijoitukseen — nappi
// näytetään tämän indeksin osion edessä (tai sen sisällä CKerrallaan-näkymässä).
export function ensimmainenHoitajaIndeksi(osiot) {
  let nahnytAsiakas = false
  for (let i = 0; i < osiot.length; i++) {
    const rooli = osiot[i]?.rooli === 'hoitaja' ? 'hoitaja' : 'asiakas'
    if (rooli === 'asiakas') {
      nahnytAsiakas = true
    } else if (nahnytAsiakas) {
      return i
    }
  }
  return -1
}

// AB-T3a: "Aloita uusi käynti" -nappi joka renderöityy roolitransition kohdalla.
// Klikkauksen jälkeen muuttuu pieneksi infoteksiksi.
// Tila ja klikkaus-handler tulevat propeina LomakeRenderoija:lta.
const napinTyyli = {
  width:         '100%',
  minHeight:     '56px',
  background:    '#10b981',     // emerald-500
  color:         'white',
  fontSize:      '15px',
  fontWeight:    '700',
  letterSpacing: '0.06em',
  borderRadius:  '12px',
  border:        'none',
  cursor:        'pointer',
  margin:        '12px 0',
  padding:       '14px 20px',
  boxShadow:     '0 2px 8px rgba(16, 185, 129, 0.25)',
  transition:    'background 0.15s',
}

const infoTeksitTyyli = {
  background:    '#f0fdf4',     // emerald-50
  border:        '1px solid #bbf7d0',  // emerald-200
  borderRadius:  '10px',
  padding:       '10px 16px',
  margin:        '8px 0',
  fontSize:      '13px',
  color:         '#065f46',     // emerald-800
  textAlign:     'center',
  fontWeight:    '500',
}

export function AloitaUusiKayntiNappi({ aloitettu, onAloita }) {
  if (aloitettu) {
    return (
      <div style={infoTeksitTyyli} role="status">
        ✓ Käynti aloitettu — voit täyttää hoitajan kirjaukset
      </div>
    )
  }
  return (
    <button type="button" onClick={onAloita} style={napinTyyli}>
      ▶ ALOITA UUSI KÄYNTI
    </button>
  )
}
