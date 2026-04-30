import AllekirjoitusPad from '../../../AllekirjoitusPad'

export default function Allekirjoitus({ virhe, onMuutos }) {
  return (
    <AllekirjoitusPad
      onChange={(dataURL) => onMuutos(dataURL || null)}
      error={!!virhe}
    />
  )
}
