import { useState, useEffect, useMemo } from 'react'
import { haeSairausTyypit } from '../../../../lib/db'

const containerTyyli = (virhe) => ({
  background:   virhe ? '#fef2f2' : '#f9fafb',
  border:       virhe ? '1.5px solid #EF4444' : '1.5px solid #e5e7eb',
  borderRadius: '12px',
  padding:      '12px',
  display:      'flex',
  flexDirection: 'column',
  gap:          '8px',
})

const ryhmaContainerTyyli = (sisaltaaVaroituksen) => ({
  background:   'white',
  borderRadius: '10px',
  border:       sisaltaaVaroituksen ? '1.5px solid #fbbf24' : '1.5px solid #e5e7eb',
  overflow:     'hidden',
})

const ryhmaHeaderTyyli = (auki) => ({
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  padding:        '12px 14px',
  background:     auki ? '#f3f4f6' : 'transparent',
  borderBottom:   auki ? '1px solid #e5e7eb' : 'none',
  cursor:         'pointer',
  border:         'none',
  width:          '100%',
  textAlign:      'left',
})

const ryhmaOtsikkoTyyli = {
  fontSize:   '14px',
  fontWeight: '600',
  color:      '#374151',
  margin:     0,
}

const ryhmaMeritsTyyli = {
  fontSize:   '12px',
  color:      '#9ca3af',
  fontWeight: '500',
}

const ryhmaNuoliTyyli = (auki) => ({
  fontSize:   '12px',
  color:      '#6b7280',
  transform:  auki ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: 'transform 0.15s',
  marginLeft: '8px',
})

// Pakota 2 palstaa kapeisiinkin näyttöihin (iPhone 13 mini ~251px sisätila ei
// riitä auto-fit minmax(180)-haarukointiin). 3+ palstaa isommilla näytöillä
// vaatisi media query — siirretään index.cssiin jos halutaan myöhemmin.
const ruudukkoTyyli = {
  display:             'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap:                 '8px',
  padding:             '10px',
}

const riviTyyli = (valittu, varoittaa) => ({
  display:      'flex',
  alignItems:   'flex-start',
  gap:          '10px',
  padding:      '8px 10px',
  background:   valittu ? (varoittaa ? '#fef3c7' : '#ecfdf5') : 'white',
  border:       valittu
                  ? (varoittaa ? '1.5px solid #fbbf24' : '1.5px solid #6ee7b7')
                  : '1.5px solid #e5e7eb',
  borderRadius: '8px',
  cursor:       'pointer',
})

const checkboxTyyli = {
  width:       '18px',
  height:      '18px',
  marginTop:   '2px',
  flexShrink:  0,
  accentColor: '#1D9E75',
  cursor:      'pointer',
}

const tekstiTyyli = {
  fontSize:   '13px',
  color:      '#111827',
  lineHeight: 1.4,
  margin:     0,
  flex:       1,
}

const varoitusMerkki = {
  fontSize:   '11px',
  color:      '#92400e',
  fontWeight: '600',
  display:    'block',
  marginTop:  '2px',
}

const lataaTyyli = {
  fontSize:   '13px',
  color:      '#9ca3af',
  textAlign:  'center',
  padding:    '16px',
  margin:     0,
}

const LAHTEET = {
  sairaustyypit_taulu: {
    hae:    haeSairausTyypit,
    nimi:   (rivi) => rivi.nimi,
    avain:  (rivi) => rivi.id,
    extra:  (rivi) => ({ kontraindikaatio: rivi.kontraindikaatio, ryhma: rivi.ryhma }),
  },
}

// Ryhmittele rivit ryhmä-attribuutin mukaan, säilyttäen ensimmäisen esiintymän järjestys.
function ryhmittele(rivit, lahde) {
  const ryhmittain = []
  const indeksi    = new Map()
  for (const r of rivit) {
    const ryhmaAvain = lahde.extra(r).ryhma ?? 'Muut'
    if (!indeksi.has(ryhmaAvain)) {
      indeksi.set(ryhmaAvain, ryhmittain.length)
      ryhmittain.push({ avain: ryhmaAvain, sairaudet: [] })
    }
    ryhmittain[indeksi.get(ryhmaAvain)].sairaudet.push(r)
  }
  return ryhmittain
}

function Ryhma({ ryhma, lahde, valitut, onToggle }) {
  const [auki, setAuki] = useState(false)

  const valittujenMaara = ryhma.sairaudet.filter((r) => valitut.has(lahde.avain(r))).length
  const sisaltaaValittujaVaroituksia = ryhma.sairaudet.some((r) => {
    const valittu = valitut.has(lahde.avain(r))
    const lisat = lahde.extra(r)
    return valittu && lisat.kontraindikaatio === true
  })

  return (
    <div style={ryhmaContainerTyyli(sisaltaaValittujaVaroituksia)}>
      <button
        type="button"
        onClick={() => setAuki((p) => !p)}
        style={ryhmaHeaderTyyli(auki)}
      >
        <p style={ryhmaOtsikkoTyyli}>{ryhma.avain}</p>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={ryhmaMeritsTyyli}>{valittujenMaara}/{ryhma.sairaudet.length} valittu</span>
          <span style={ryhmaNuoliTyyli(auki)}>▼</span>
        </span>
      </button>

      {auki && (
        <div style={ruudukkoTyyli}>
          {ryhma.sairaudet.map((rivi) => {
            const avain     = lahde.avain(rivi)
            const nimi      = lahde.nimi(rivi)
            const lisat     = lahde.extra(rivi)
            const valittu   = valitut.has(avain)
            const varoittaa = lisat.kontraindikaatio === true

            return (
              <label key={avain} style={riviTyyli(valittu, valittu && varoittaa)}>
                <input
                  type="checkbox"
                  checked={valittu}
                  onChange={() => onToggle(avain)}
                  style={checkboxTyyli}
                />
                <p style={tekstiTyyli}>
                  {nimi}
                  {varoittaa && valittu && <span style={varoitusMerkki}>⚠ Vaikuttaa hoitoon</span>}
                </p>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CheckboxLista({ kentta, arvo, virhe, onMuutos }) {
  const lahdeAvain = kentta.validointi?.lahde
  const lahde      = LAHTEET[lahdeAvain]
  const [vaihtoehdot, setVaihtoehdot] = useState([])
  const [lataa,       setLataa]       = useState(true)
  const [virhetila,   setVirhetila]   = useState(null)

  useEffect(() => {
    if (!lahde) { setLataa(false); setVirhetila(`Tuntematon lähde: ${lahdeAvain}`); return }
    let peruttu = false
    setLataa(true)
    lahde.hae()
      .then((rivit) => {
        if (peruttu) return
        setVaihtoehdot(rivit ?? [])
        setVirhetila(null)
      })
      .catch((e) => { if (!peruttu) setVirhetila(e.message ?? 'Lataus epäonnistui') })
      .finally(() => { if (!peruttu) setLataa(false) })
    return () => { peruttu = true }
  }, [lahdeAvain])

  const valitut = useMemo(() => new Set(Array.isArray(arvo) ? arvo : []), [arvo])

  const ryhmittain = useMemo(
    () => (lahde ? ryhmittele(vaihtoehdot, lahde) : []),
    [vaihtoehdot, lahde]
  )

  function toggle(avain) {
    const seuraava = new Set(valitut)
    if (seuraava.has(avain)) seuraava.delete(avain)
    else seuraava.add(avain)
    onMuutos([...seuraava])
  }

  if (!lahde) {
    return (
      <div style={containerTyyli(true)}>
        <p style={lataaTyyli}>Tuntematon listan lähde: <code>{lahdeAvain}</code></p>
      </div>
    )
  }

  if (lataa) {
    return (
      <div style={containerTyyli(false)}>
        <p style={lataaTyyli}>Ladataan listaa…</p>
      </div>
    )
  }

  if (virhetila) {
    return (
      <div style={containerTyyli(true)}>
        <p style={lataaTyyli}>Listan lataus epäonnistui: {virhetila}</p>
      </div>
    )
  }

  return (
    <div style={containerTyyli(virhe)}>
      {ryhmittain.map((ryhma) => (
        <Ryhma
          key={ryhma.avain}
          ryhma={ryhma}
          lahde={lahde}
          valitut={valitut}
          onToggle={toggle}
        />
      ))}
    </div>
  )
}
