import { useAutoResize } from '../../../../hooks/useAutoResize'

const textareaTyyli = (virhe) => ({
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

export default function Tekstikentta({ kentta, arvo, virhe, onMuutos }) {
  const fi  = kentta.kaannokset?.fi ?? {}
  const ref = useAutoResize(arvo ?? '')

  return (
    <textarea
      ref={ref}
      rows={3}
      value={arvo ?? ''}
      onChange={(e) => onMuutos(e.target.value)}
      placeholder={fi.placeholder ?? ''}
      style={textareaTyyli(virhe)}
    />
  )
}
