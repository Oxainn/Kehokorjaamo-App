const containerTyyli = (virhe) => ({
  display:    'flex',
  alignItems: 'flex-start',
  gap:        '12px',
  padding:    '12px 14px',
  background: virhe ? '#fef2f2' : '#f9fafb',
  borderRadius: '12px',
  border:     virhe ? '1.5px solid #EF4444' : '1.5px solid #e2e8f0',
  cursor:     'pointer',
})

const checkboxTyyli = {
  width:     '22px',
  height:    '22px',
  marginTop: '1px',
  flexShrink: 0,
  accentColor: '#1D9E75',
  cursor:    'pointer',
}

const otsikkoTyyli = {
  fontSize:   '14px',
  fontWeight: '500',
  color:      '#111827',
  lineHeight: 1.4,
  margin:     0,
}

const tahti = {
  color:      '#EF4444',
  marginLeft: '3px',
}

const apuriviTyyli = {
  fontSize:   '12px',
  color:      '#6b7280',
  margin:     '4px 0 0 0',
  lineHeight: 1.4,
}

export default function Checkbox({ kentta, kenttamerkinta, arvo, virhe, onMuutos }) {
  const fi         = kentta.kaannokset?.fi ?? {}
  const pakollinen = kenttamerkinta?.pakollinen || kentta.validointi?.pakollinen
  const tarkistettu = arvo === true

  return (
    <label style={containerTyyli(virhe)}>
      <input
        type="checkbox"
        checked={tarkistettu}
        onChange={(e) => onMuutos(e.target.checked)}
        style={checkboxTyyli}
      />
      <div style={{ flex: 1 }}>
        <p style={otsikkoTyyli}>
          {fi.otsikko ?? kentta.tunniste}
          {pakollinen && <span style={tahti}>*</span>}
        </p>
        {fi.apurivi && <p style={apuriviTyyli}>{fi.apurivi}</p>}
      </div>
    </label>
  )
}
