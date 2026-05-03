import { Fragment } from 'react'
import Osio from '../Osio'
import {
  RoolitransitioOtsikko,
  AloitaUusiKayntiNappi,
  osionReunaTyyli,
  lisaaTransitiot,
  ensimmainenHoitajaIndeksi,
} from '../roolitransitio'

const lahetysTyyli = {
  width:        '100%',
  minHeight:    '52px',
  borderRadius: '12px',
  border:       'none',
  background:   '#1D9E75',
  color:        'white',
  fontSize:     '15px',
  fontWeight:   '700',
  letterSpacing: '0.03em',
  cursor:       'pointer',
  transition:   'background 0.15s',
}

export default function NayttoYksiSivu({
  rakenne, kentat, vastaukset, virheet, onKenttamuutos, onLahetys,
  uusiKayntiAloitettu, onAloitaUusiKaynti,
}) {
  const osiot = (rakenne?.osiot ?? []).slice().sort((a, b) => (a.jarjestys ?? 0) - (b.jarjestys ?? 0))
  const lista = lisaaTransitiot(osiot)
  const aloitusIdx = ensimmainenHoitajaIndeksi(osiot)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {lista.map(({ osio, naytaTransitio, rooli }, idx) => (
        <Fragment key={osio.id}>
          {idx === aloitusIdx && (
            <AloitaUusiKayntiNappi
              aloitettu={uusiKayntiAloitettu}
              onAloita={onAloitaUusiKaynti}
            />
          )}
          {naytaTransitio && <RoolitransitioOtsikko rooli={rooli} />}
          <div
            style={{
              background:    'white',
              borderRadius:  '16px',
              border:        '1px solid #e2e8f0',
              ...osionReunaTyyli(rooli),
              boxShadow:     '0 1px 4px rgba(0,0,0,0.05)',
              padding:       '24px',
            }}
          >
            <Osio
              osio={osio}
              kentat={kentat}
              vastaukset={vastaukset}
              virheet={virheet}
              onKenttamuutos={onKenttamuutos}
            />
          </div>
        </Fragment>
      ))}

      {onLahetys && (
        <button type="button" onClick={onLahetys} style={lahetysTyyli}>
          LÄHETÄ LOMAKE
        </button>
      )}
    </div>
  )
}
