import { useAutoResize } from '../../../../hooks/useAutoResize'

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
  lineHeight:   1.4,
  resize:       'none',
  overflow:     'hidden',
})

export default function Tekstirivi({ kentta, arvo, virhe, onMuutos }) {
  const fi  = kentta.kaannokset?.fi ?? {}
  const ref = useAutoResize(arvo ?? '')

  // Tekstirivi pysyy yksirivisenä semantiikaltaan — Enter ei luo rivinvaihtoa.
  // Korkeus voi kuitenkin kasvaa jos teksti rivittyy automaattisesti (pitkä sähköposti tms.).
  function estaEnter(e) {
    if (e.key === 'Enter') e.preventDefault()
  }

  return (
    <textarea
      ref={ref}
      rows={1}
      value={arvo ?? ''}
      onChange={(e) => onMuutos(e.target.value)}
      onKeyDown={estaEnter}
      placeholder={fi.placeholder ?? ''}
      style={inputTyyli(virhe)}
    />
  )
}
