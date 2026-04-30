const inputTyyli = {
  width:        '100%',
  padding:      '11px 12px',
  borderRadius: '10px',
  border:       '1.5px solid #e2e8f0',
  fontSize:     '14px',
  color:        '#111827',
  outline:      'none',
  boxSizing:    'border-box',
  background:   'white',
  fontFamily:   'inherit',
}

export default function Tekstirivi({ kentta, arvo, onMuutos }) {
  const fi = kentta.kaannokset?.fi ?? {}

  return (
    <input
      type="text"
      value={arvo ?? ''}
      onChange={(e) => onMuutos(e.target.value)}
      placeholder={fi.placeholder ?? ''}
      style={inputTyyli}
    />
  )
}
