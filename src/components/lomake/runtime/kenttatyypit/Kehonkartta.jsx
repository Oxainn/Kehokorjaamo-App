import Osio4Kehonkartta from '../../Osio4Kehonkartta'

const oletusArvo = { merkinnat: {}, vedot: [], kuva: null, hahmo: 'nainen' }

const containerTyyli = (virhe) => ({
  border:       virhe ? '1.5px solid #EF4444' : '1px solid transparent',
  borderRadius: '12px',
  background:   virhe ? '#fef2f2' : 'transparent',
  padding:      virhe ? '8px' : 0,
})

export default function Kehonkartta({ arvo, virhe, onMuutos }) {
  return (
    <div style={containerTyyli(virhe)}>
      <Osio4Kehonkartta arvo={arvo ?? oletusArvo} onMuutos={onMuutos} />
    </div>
  )
}
