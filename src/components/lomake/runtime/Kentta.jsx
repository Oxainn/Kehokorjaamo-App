import Tekstirivi from './kenttatyypit/Tekstirivi'
import Tekstikentta from './kenttatyypit/Tekstikentta'
import Sahkoposti from './kenttatyypit/Sahkoposti'
import Puhelin from './kenttatyypit/Puhelin'
import Paivamaara from './kenttatyypit/Paivamaara'
import Numero from './kenttatyypit/Numero'
import Checkbox from './kenttatyypit/Checkbox'
import Liukusaadin from './kenttatyypit/Liukusaadin'
import CheckboxLista from './kenttatyypit/CheckboxLista'
import Kehonkartta from './kenttatyypit/Kehonkartta'
import Allekirjoitus from './kenttatyypit/Allekirjoitus'
import Infoteksti from './kenttatyypit/Infoteksti'
import Kuvantaminen from './kenttatyypit/Kuvantaminen'
import Linjausmittari from './kenttatyypit/Linjausmittari'

const KENTTATYYPIT = {
  tekstirivi:    Tekstirivi,
  tekstikentta:  Tekstikentta,
  sahkoposti:    Sahkoposti,
  puhelin:       Puhelin,
  paivamaara:    Paivamaara,
  numero:        Numero,
  checkbox:      Checkbox,
  liukusaadin:   Liukusaadin,
  checkbox_lista: CheckboxLista,
  kehonkartta:   Kehonkartta,
  allekirjoitus: Allekirjoitus,
  infoteksti:    Infoteksti,
  kuvantaminen:  Kuvantaminen,
  linjausmittari: Linjausmittari,
}

// Tyypit jotka hoitavat oman otsikkonsa ja apurivinsä komponentin sisällä —
// Kentta-wrapperi ei piirrä yläpuolen labelia näille.
// AB-T7: kuvantaminen sisältää omat ryhmäotsikot eikä tunne pakollinen/pysyvä-semantiikkaa.
// Pala 1.1: linjausmittari piirtää oman otsikon (mittari.nimi) MittariSliideri:n
//           kautta — vältetään tupla-otsikko.
const SISAINEN_LABEL = new Set(['checkbox', 'infoteksti', 'kuvantaminen', 'linjausmittari'])

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

// AB-T3b: pieni 🔒-merkki labelin perässä kun kenttä on pysyvä — säilyy
// "Aloita uusi käynti" -tyhjennyksessä. Tooltip selittää.
const lukko = {
  marginLeft: '6px',
  fontSize:   '11px',
  opacity:    0.65,
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

const virhevistiTyyli = {
  fontSize:   '12px',
  color:      '#b91c1c',
  margin:     '4px 0 0 0',
  fontWeight: '500',
}

const apuriviTyyli = {
  fontSize:   '12px',
  color:      '#6b7280',
  margin:     '4px 0 0 0',
}

export default function Kentta({ kentta, kenttamerkinta, arvo, virhe, onMuutos }) {
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
          {kentta.pysyva && (
            <span style={lukko} title="Pysyvä kenttä — säilyy seuraavalle käynnille">🔒</span>
          )}
        </label>
        <div style={eiTuettu}>
          Kenttätyyppiä &laquo;{kentta.tyyppi}&raquo; ei vielä tueta renderöijässä
        </div>
      </div>
    )
  }

  if (SISAINEN_LABEL.has(kentta.tyyppi)) {
    return (
      <div>
        <Komponentti
          kentta={kentta}
          kenttamerkinta={kenttamerkinta}
          arvo={arvo}
          virhe={virhe}
          onMuutos={onMuutos}
        />
        {virhe && <p style={virhevistiTyyli}>{virhe}</p>}
      </div>
    )
  }

  return (
    <div>
      <label style={labelTyyli}>
        {fi.otsikko ?? kentta.tunniste}
        {kenttamerkinta?.pakollinen && <span style={tahti}>*</span>}
        {kentta.pysyva && (
          <span style={lukko} title="Pysyvä kenttä — säilyy seuraavalle käynnille">🔒</span>
        )}
      </label>
      <Komponentti
        kentta={kentta}
        kenttamerkinta={kenttamerkinta}
        arvo={arvo}
        virhe={virhe}
        onMuutos={onMuutos}
      />
      {virhe && <p style={virhevistiTyyli}>{virhe}</p>}
      {!virhe && fi.apurivi && <p style={apuriviTyyli}>{fi.apurivi}</p>}
    </div>
  )
}
