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

const riviTyyli = (valittu, varoittaa) => ({
  display:      'flex',
  alignItems:   'flex-start',
  gap:          '12px',
  padding:      '10px 12px',
  background:   valittu ? (varoittaa ? '#fef3c7' : '#ecfdf5') : 'white',
  border:       valittu
                  ? (varoittaa ? '1.5px solid #fbbf24' : '1.5px solid #6ee7b7')
                  : '1.5px solid #e5e7eb',
  borderRadius: '10px',
  cursor:       'pointer',
})

const checkboxTyyli = {
  width:       '20px',
  height:      '20px',
  marginTop:   '1px',
  flexShrink:  0,
  accentColor: '#1D9E75',
  cursor:      'pointer',
}

const tekstiTyyli = {
  fontSize:   '14px',
  color:      '#111827',
  lineHeight: 1.4,
  margin:     0,
  flex:       1,
}

const varoitusMerkki = {
  fontSize:   '12px',
  color:      '#92400e',
  fontWeight: '600',
  marginLeft: '4px',
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
      {vaihtoehdot.map((rivi) => {
        const avain   = lahde.avain(rivi)
        const nimi    = lahde.nimi(rivi)
        const lisat   = lahde.extra(rivi)
        const valittu = valitut.has(avain)
        const varoittaa = lisat.kontraindikaatio === true

        return (
          <label key={avain} style={riviTyyli(valittu, valittu && varoittaa)}>
            <input
              type="checkbox"
              checked={valittu}
              onChange={() => toggle(avain)}
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
  )
}
