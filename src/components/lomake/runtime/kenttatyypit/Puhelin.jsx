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

const muotoilePuhelin = (arvo) => {
  if (!arvo) return ''
  const t = arvo.trim()
  if (t.startsWith('+')) return t
  const n = t.replace(/\D/g, '')
  if (n.length <= 3) return n
  if (n.length <= 6) return `${n.slice(0, 3)} ${n.slice(3)}`
  // Säilytä kaikki numerot — pitkät numerot (ulkomaiset, alanumerot) eivät saa kadota
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
}

export default function Puhelin({ kentta, arvo, virhe, onMuutos }) {
  const fi = kentta.kaannokset?.fi ?? {}

  return (
    <input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={arvo ?? ''}
      onChange={(e) => onMuutos(muotoilePuhelin(e.target.value))}
      placeholder={fi.placeholder ?? ''}
      style={inputTyyli(virhe)}
    />
  )
}
