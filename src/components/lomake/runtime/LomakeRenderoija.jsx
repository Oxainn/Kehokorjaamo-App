import { useState, useEffect, useMemo } from 'react'
import { useLomakepohja } from '../../../hooks/useLomakepohja'
import { validoiVastaukset } from '../../../lib/lomakeValidointi'
import { normalisoiPohjaRakenne } from '../../../lib/db'
import NayttoYksiSivu from './nayttotyylit/NayttoYksiSivu'
import NayttoCKerrallaan from './nayttotyylit/NayttoCKerrallaan'
import NayttoAccordion from './nayttotyylit/NayttoAccordion'

const NAYTTOTYYLIT = {
  yksi_sivu: NayttoYksiSivu,
  c:         NayttoCKerrallaan,
  accordion: NayttoAccordion,
}

const tilaTyyli = {
  fontSize:   '14px',
  color:      '#6b7280',
  textAlign:  'center',
  padding:    '32px 16px',
}

const virheTyyli = {
  ...tilaTyyli,
  color:        '#b91c1c',
  background:   '#fef2f2',
  borderRadius: '12px',
  border:       '1px solid #fecaca',
}

const yhteenvetoTyyli = {
  background:   '#fef2f2',
  border:       '1px solid #fecaca',
  borderRadius: '12px',
  padding:      '12px 16px',
  color:        '#991b1b',
  fontSize:     '13px',
  lineHeight:   1.5,
}

// LomakeRenderoija voi saada rakenteen kahdella tavalla:
// 1. pohjaId — useLomakepohja-hookki lataa rakenteen + kentät tietokannasta
// 2. valmiitTiedot = { rakenne, kentat } — käytä suoraan annettuja arvoja
//    (esikatselu editorista — rakenne on tallentamaton)
export default function LomakeRenderoija({ pohjaId, valmiitTiedot, vastaukset, onMuutos, onLahetys }) {
  const haetut = useLomakepohja(valmiitTiedot ? null : pohjaId)

  const rakenneRaaka = valmiitTiedot?.rakenne ?? haetut.rakenne
  // AB-T2c: normalisoi defensiivisesti — `valmiitTiedot.rakenne` voi tulla
  // esikatselusta normalisoimattomana. haeLomakepohja palauttaa jo normalisoidun,
  // joten tässä uudelleenkutsu on idempotent.
  const rakenne = useMemo(() => normalisoiPohjaRakenne(rakenneRaaka), [rakenneRaaka])
  const kentat  = valmiitTiedot?.kentat  ?? haetut.kentat
  const lataa   = !valmiitTiedot && haetut.lataa
  const virhe   = !valmiitTiedot && haetut.virhe

  const [virheet,  setVirheet]  = useState({})
  const [yritetty, setYritetty] = useState(false)
  // AB-T3a: kun hoitaja klikkaa "Aloita uusi käynti" -nappia, tila vaihtuu true:ksi.
  // Resetoidaan kun pohja vaihtuu (uusi lomake = uusi käynti).
  const [uusiKayntiAloitettu, setUusiKayntiAloitettu] = useState(false)

  useEffect(() => {
    setVirheet({})
    setYritetty(false)
    setUusiKayntiAloitettu(false)
  }, [pohjaId, valmiitTiedot])

  if (lataa) return <div style={tilaTyyli}>Ladataan lomakepohjaa…</div>
  if (virhe) return <div style={virheTyyli}>Virhe: {virhe}</div>
  if (!rakenne) return <div style={tilaTyyli}>Lomakepohjaa ei löytynyt.</div>

  const tyyliAvain = rakenne.nayttotyyli ?? 'yksi_sivu'
  const Naytto     = NAYTTOTYYLIT[tyyliAvain]

  if (!Naytto) {
    return (
      <div style={virheTyyli}>
        Näyttötyyliä &laquo;{tyyliAvain}&raquo; ei vielä tueta. Käytettävissä: {Object.keys(NAYTTOTYYLIT).join(', ')}.
      </div>
    )
  }

  function paivitaKentta(tunniste, uusiArvo) {
    // Funktionaalinen päivitys jotta stale-closurella varustetut komponentit
    // (esim. AllekirjoitusPad jonka useEffect on tallentanut callback-referenssin)
    // eivät yliaja toisten kenttien arvoja.
    onMuutos((edellinen) => ({ ...(edellinen ?? {}), [tunniste]: uusiArvo }))
    setVirheet((prev) => {
      if (!prev[tunniste]) return prev
      const { [tunniste]: _, ...loput } = prev
      return loput
    })
  }

  function lahetaLomake() {
    const uudetVirheet = validoiVastaukset(rakenne, kentat, vastaukset ?? {})
    setVirheet(uudetVirheet)
    setYritetty(true)
    if (Object.keys(uudetVirheet).length === 0 && onLahetys) {
      onLahetys(vastaukset ?? {})
    }
  }

  const virheidenMaara = Object.keys(virheet).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {yritetty && virheidenMaara > 0 && (
        <div style={yhteenvetoTyyli}>
          Lomakkeessa on {virheidenMaara} {virheidenMaara === 1 ? 'puute' : 'puutetta'}.
          Punaisella merkityt pakolliset kentät ovat tyhjiä.
        </div>
      )}

      <Naytto
        rakenne={rakenne}
        kentat={kentat}
        vastaukset={vastaukset ?? {}}
        virheet={virheet}
        onKenttamuutos={paivitaKentta}
        onLahetys={onLahetys ? lahetaLomake : null}
        uusiKayntiAloitettu={uusiKayntiAloitettu}
        onAloitaUusiKaynti={() => setUusiKayntiAloitettu(true)}
      />
    </div>
  )
}
