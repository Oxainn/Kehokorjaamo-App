import { useState } from 'react'

const containerTyyli = (virhe) => ({
  background:   virhe ? '#fef2f2' : '#f9fafb',
  border:       virhe ? '1.5px solid #EF4444' : '1.5px solid #e5e7eb',
  borderRadius: '12px',
  padding:      '16px',
  display:      'flex',
  flexDirection: 'column',
  gap:          '12px',
})

const arvoNayttoTyyli = (vari) => ({
  fontSize:     '36px',
  fontWeight:   '700',
  color:        vari,
  textAlign:    'center',
  margin:       0,
  letterSpacing: '-0.02em',
  lineHeight:   1,
})

const eiValittuTyyli = {
  fontSize:   '14px',
  color:      '#9ca3af',
  textAlign:  'center',
  margin:     0,
  fontStyle:  'italic',
}

const ohjerivinTyyli = {
  display:    'flex',
  justifyContent: 'space-between',
  fontSize:   '12px',
  color:      '#6b7280',
}

const sliderTyyli = {
  width:        '100%',
  accentColor:  '#185FA5',
  height:       '6px',
}

function arvonVari(arvo, min, max, varikoodaus) {
  if (varikoodaus !== 'vihrea_keltainen_punainen') return '#185FA5'
  const suhde = (arvo - min) / (max - min)
  if (suhde <= 0.4) return '#1D9E75'  // vihreä
  if (suhde <= 0.7) return '#D97706'  // keltainen/oranssi
  return '#DC2626'                     // punainen
}

export default function Liukusaadin({ kentta, arvo, virhe, onMuutos }) {
  const validointi = kentta.validointi ?? {}
  const oletukset  = kentta.oletukset ?? {}
  const min        = validointi.min ?? 0
  const max        = validointi.max ?? 10
  const askel      = oletukset.askel ?? 1
  const varikoodaus = oletukset.varikoodaus ?? null
  const ohjeet     = oletukset.ohjeet ?? {}

  const [koskettu, setKoskettu] = useState(arvo !== null && arvo !== undefined)

  function paivita(uusi) {
    setKoskettu(true)
    onMuutos(Number(uusi))
  }

  const naytaArvo = (koskettu && arvo !== null && arvo !== undefined) ? arvo : null
  const sliderArvo = naytaArvo ?? Math.round((min + max) / 2)
  const vari = naytaArvo !== null ? arvonVari(naytaArvo, min, max, varikoodaus) : '#9ca3af'

  return (
    <div style={containerTyyli(virhe)}>
      {naytaArvo !== null
        ? <p style={arvoNayttoTyyli(vari)}>{naytaArvo}</p>
        : <p style={eiValittuTyyli}>Liu&apos;uta säädintä valitaksesi</p>}

      <input
        type="range"
        min={min}
        max={max}
        step={askel}
        value={sliderArvo}
        onChange={(e) => paivita(e.target.value)}
        onTouchStart={() => setKoskettu(true)}
        onMouseDown={() => setKoskettu(true)}
        style={sliderTyyli}
      />

      <div style={ohjerivinTyyli}>
        <span>{min} — {ohjeet.min?.fi ?? ''}</span>
        <span>{ohjeet.max?.fi ?? ''} — {max}</span>
      </div>
    </div>
  )
}
