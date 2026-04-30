import Tekstirivi from './kenttatyypit/Tekstirivi'
import Tekstikentta from './kenttatyypit/Tekstikentta'
import Sahkoposti from './kenttatyypit/Sahkoposti'
import Puhelin from './kenttatyypit/Puhelin'
import Paivamaara from './kenttatyypit/Paivamaara'
import Numero from './kenttatyypit/Numero'
import Checkbox from './kenttatyypit/Checkbox'

const KENTTATYYPIT = {
  tekstirivi:   Tekstirivi,
  tekstikentta: Tekstikentta,
  sahkoposti:   Sahkoposti,
  puhelin:      Puhelin,
  paivamaara:   Paivamaara,
  numero:       Numero,
  checkbox:     Checkbox,
}

// Tyypit jotka hoitavat oman otsikkonsa ja apurivinsä komponentin sisällä —
// Kentta-wrapperi ei piirrä yläpuolen labelia näille.
const SISAINEN_LABEL = new Set(['checkbox'])

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

  if (SISAINEN_LABEL.has(kentta.tyyppi)) {
    return (
      <Komponentti kentta={kentta} kenttamerkinta={kenttamerkinta} arvo={arvo} onMuutos={onMuutos} />
    )
  }

  return (
    <div>
      <label style={labelTyyli}>
        {fi.otsikko ?? kentta.tunniste}
        {kenttamerkinta?.pakollinen && <span style={tahti}>*</span>}
      </label>
      <Komponentti kentta={kentta} kenttamerkinta={kenttamerkinta} arvo={arvo} onMuutos={onMuutos} />
      {fi.apurivi && (
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>{fi.apurivi}</p>
      )}
    </div>
  )
}
