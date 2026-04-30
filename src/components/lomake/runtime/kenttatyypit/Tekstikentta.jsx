const textareaTyyli = (virhe) => ({
  width:        '100%',
  minHeight:    '100px',
  padding:      '11px 12px',
  borderRadius: '10px',
  border:       virhe ? '1.5px solid #EF4444' : '1.5px solid #e2e8f0',
  fontSize:     '14px',
  color:        '#111827',
  outline:      'none',
  boxSizing:    'border-box',
  background:   virhe ? '#fef2f2' : 'white',
  fontFamily:   'inherit',
  resize:       'vertical',
})

export default function Tekstikentta({ kentta, arvo, virhe, onMuutos }) {
  const fi = kentta.kaannokset?.fi ?? {}

  return (
    <textarea
      value={arvo ?? ''}
      onChange={(e) => onMuutos(e.target.value)}
      placeholder={fi.placeholder ?? ''}
      style={textareaTyyli(virhe)}
    />
  )
}
