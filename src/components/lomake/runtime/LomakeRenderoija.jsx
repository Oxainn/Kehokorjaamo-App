import { useState, useEffect } from 'react'
import { useLomakepohja } from '../../../hooks/useLomakepohja'
import { validoiVastaukset } from '../../../lib/lomakeValidointi'
import NayttoYksiSivu from './nayttotyylit/NayttoYksiSivu'
import NayttoCKerrallaan from './nayttotyylit/NayttoCKerrallaan'

const NAYTTOTYYLIT = {
  yksi_sivu: NayttoYksiSivu,
  c:         NayttoCKerrallaan,
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

export default function LomakeRenderoija({ pohjaId, vastaukset, onMuutos, onLahetys }) {
  const { rakenne, kentat, lataa, virhe } = useLomakepohja(pohjaId)
  const [virheet,  setVirheet]  = useState({})
  const [yritetty, setYritetty] = useState(false)

  useEffect(() => {
    setVirheet({})
    setYritetty(false)
  }, [pohjaId])

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
    onMuutos({ ...vastaukset, [tunniste]: uusiArvo })
    if (virheet[tunniste]) {
      const { [tunniste]: _, ...loput } = virheet
      setVirheet(loput)
    }
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
      />
    </div>
  )
}
