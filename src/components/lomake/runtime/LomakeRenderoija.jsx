import { useLomakepohja } from '../../../hooks/useLomakepohja'
import NayttoYksiSivu from './nayttotyylit/NayttoYksiSivu'

const NAYTTOTYYLIT = {
  yksi_sivu: NayttoYksiSivu,
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

export default function LomakeRenderoija({ pohjaId, vastaukset, onMuutos }) {
  const { rakenne, kentat, lataa, virhe } = useLomakepohja(pohjaId)

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
  }

  return (
    <Naytto
      rakenne={rakenne}
      kentat={kentat}
      vastaukset={vastaukset ?? {}}
      onKenttamuutos={paivitaKentta}
    />
  )
}
