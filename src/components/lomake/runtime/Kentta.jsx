import Tekstirivi from './kenttatyypit/Tekstirivi'
import Tekstikentta from './kenttatyypit/Tekstikentta'

const KENTTATYYPIT = {
  tekstirivi:   Tekstirivi,
  tekstikentta: Tekstikentta,
}

const labelTyyli = {
  fontSize:   '13px',
  fontWeight: '600',
  color:      '#374151',
  display:    'block',
  marginBottom: '5px',
}

const tahti = {
  color:      '#EF4444',
  marginLeft: '3px',
}

const eiTuettu = {
  fontSize:   '12px',
  color:      '#9ca3af',
  fontStyle:  'italic',
  padding:    '8px 12px',
  background: '#f9fafb',
  borderRadius: '8px',
  border:     '1px dashed #e5e7eb',
}

export default function Kentta({ kentta, kenttamerkinta, arvo, onMuutos }) {
  if (!kentta) {
    return (
      <div style={eiTuettu}>
        Kenttää &laquo;{kenttamerkinta?.kentta_id_tunniste}&raquo; ei löytynyt kenttäkirjastosta
      </div>
    )
  }

  const Komponentti = KENTTATYYPIT[kentta.tyyppi]
  const fi          = kentta.kaannokset?.fi ?? {}

  if (!Komponentti) {
    return (
      <div>
        <label style={labelTyyli}>
          {fi.otsikko ?? kentta.tunniste}
          {kenttamerkinta?.pakollinen && <span style={tahti}>*</span>}
        </label>
        <div style={eiTuettu}>
          Kenttätyyppiä &laquo;{kentta.tyyppi}&raquo; ei vielä tueta renderöijässä
        </div>
      </div>
    )
  }

  return (
    <div>
      <label style={labelTyyli}>
        {fi.otsikko ?? kentta.tunniste}
        {kenttamerkinta?.pakollinen && <span style={tahti}>*</span>}
      </label>
      <Komponentti kentta={kentta} arvo={arvo} onMuutos={onMuutos} />
      {fi.apurivi && (
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>{fi.apurivi}</p>
      )}
    </div>
  )
}
