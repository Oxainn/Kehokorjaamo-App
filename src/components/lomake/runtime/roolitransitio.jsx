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
