const inputTyyli = {
  width:            '100%',
  padding:          '11px 12px',
  borderRadius:     '10px',
  border:           '1.5px solid #e2e8f0',
  fontSize:         '14px',
  color:            '#111827',
  outline:          'none',
  boxSizing:        'border-box',
  background:       'white',
  fontFamily:       'inherit',
  appearance:       'textfield',
  WebkitAppearance: 'none',
  MozAppearance:    'textfield',
}

const yksikkoTyyli = {
  position:    'absolute',
  right:       '12px',
  top:         '50%',
  transform:   'translateY(-50%)',
  fontSize:    '13px',
  color:       '#9ca3af',
  fontWeight:  '500',
  pointerEvents: 'none',
}

export default function Numero({ kentta, arvo, onMuutos }) {
  const fi         = kentta.kaannokset?.fi ?? {}
  const validointi = kentta.validointi ?? {}
  const oletukset  = kentta.oletukset ?? {}
  const yksikko    = oletukset.nayta_yksikko ? oletukset.yksikko : null

  function paivita(uusi) {
    if (uusi === '') { onMuutos(null); return }
    const n = Number(uusi)
    if (Number.isNaN(n)) return
    onMuutos(n)
  }

  const tyyli = yksikko ? { ...inputTyyli, paddingRight: '48px' } : inputTyyli

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="number"
        inputMode="numeric"
        value={arvo ?? ''}
        onChange={(e) => paivita(e.target.value)}
        placeholder={fi.placeholder ?? ''}
        min={validointi.min}
        max={validointi.max}
        style={tyyli}
      />
      {yksikko && <span style={yksikkoTyyli}>{yksikko}</span>}
    </div>
  )
}
