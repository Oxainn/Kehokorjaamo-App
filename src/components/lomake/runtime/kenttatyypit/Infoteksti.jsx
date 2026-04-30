// Infoteksti — staattinen tekstilohko lomakkeessa, ei syötettä.
// Käyttö: palvelukuvaus, lisäohjeet, väliotsikko osioiden välissä.
// Sisältö luetaan kentta.kaannokset.fi.sisalto:sta.

const containerTyyli = {
  background:   '#f9fafb',
  border:       '1px solid #e5e7eb',
  borderRadius: '12px',
  padding:      '14px 16px',
  display:      'flex',
  flexDirection: 'column',
  gap:          '6px',
}

const otsikkoTyyli = {
  fontSize:   '14px',
  fontWeight: '600',
  color:      '#374151',
  margin:     0,
  lineHeight: 1.4,
}

const sisaltoTyyli = {
  fontSize:   '14px',
  color:      '#4b5563',
  margin:     0,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
}

export default function Infoteksti({ kentta }) {
  const fi = kentta.kaannokset?.fi ?? {}
  const otsikko = fi.otsikko?.trim() ?? ''
  const sisalto = fi.sisalto?.trim() ?? fi.apurivi?.trim() ?? ''

  // Jos ei sisältöä, älä renderöi mitään näkyvää
  if (!otsikko && !sisalto) return null

  return (
    <div style={containerTyyli}>
      {otsikko && <p style={otsikkoTyyli}>{otsikko}</p>}
      {sisalto && <p style={sisaltoTyyli}>{sisalto}</p>}
    </div>
  )
}
