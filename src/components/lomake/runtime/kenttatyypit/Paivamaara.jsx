const inputTyyli = (virhe) => ({
  width:        '100%',
  padding:      '11px 12px',
  borderRadius: '10px',
  border:       virhe ? '1.5px solid #EF4444' : '1.5px solid #e2e8f0',
  fontSize:     '14px',
  color:        '#111827',
  outline:      'none',
  boxSizing:    'border-box',
  background:   virhe ? '#fef2f2' : 'white',
  fontFamily:   'inherit',
})

export default function Paivamaara({ kentta, arvo, virhe, onMuutos }) {
  return (
    <input
      type="date"
      value={arvo ?? ''}
      onChange={(e) => onMuutos(e.target.value || null)}
      style={inputTyyli(virhe)}
    />
  )
}
