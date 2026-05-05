// Linjausmittari — runtime-kenttätyyppi joka kokoaa Hoitokirjaus.jsx:n B3-palan
// (yksittäinen asentomittari liukusäätimellä) lomakepohjaan lisättäväksi kentäksi.
//
// Käyttää suoraan olemassa olevaa MittariSliideri-komponenttia — ei duplikaatiota.
//
// Mittarin tyyppi (esim. "lantion_kallistus_aste") määräytyy kentän
// oletukset.mittari_sarake -arvon perusteella → MITTARIT.find(). Sama mittari-
// määritys (min, max, step, normaali, yksikkö) kuin kovakoodatussa Hoitokirjaus-
// näkymässä — sama lähde data/linjausmittarit.js.
//
// Tallennus: arvo (numero tai null) menee vastaukset-jsonbiin kentän tunnisteella.
// Tämä eroaa vanhasta mallista jossa mittari tallentui hoitokaynnit-rivin omaan
// sarakkeeseen — uudessa mallissa mittari on yksi kenttä muiden joukossa.
//
// B4-vertailu edelliseen käyntiin lisätään myöhemmin (vaatii edellisetMittarit
// LomakeKonteksti:iin tai erillisen hookin).

import { MITTARIT } from '../../../../data/linjausmittarit'
import MittariSliideri from '../../../MittariSliideri'

const ohjeTyyli = {
  fontSize:     '13px',
  color:        '#b91c1c',
  fontStyle:    'italic',
  padding:      '12px',
  background:   '#fef2f2',
  border:       '1px dashed #fecaca',
  borderRadius: '12px',
}

export default function Linjausmittari({ kentta, arvo, onMuutos }) {
  // Kentän oletukset.mittari_sarake kertoo mistä MITTARIT-listan mittarista on kyse.
  // Sama avain (esim. 'lantion_kallistus_aste') käytetty MITTARIT.sarake-attribuutissa.
  const mittariSarake = kentta?.oletukset?.mittari_sarake
  const mittari = mittariSarake
    ? MITTARIT.find((m) => m.sarake === mittariSarake)
    : null

  if (!mittari) {
    return (
      <div style={ohjeTyyli}>
        Linjausmittarin tyyppi puuttuu kentän asetuksista
        (<code>oletukset.mittari_sarake</code>). Tarkista kenttäkirjastosta että
        kenttä viittaa johonkin <code>data/linjausmittarit.js</code>:n MITTARIT-
        listan sarake-arvoon (esim. <code>lantion_kallistus_aste</code>).
      </div>
    )
  }

  return (
    <MittariSliideri
      mittari={mittari}
      arvo={arvo ?? null}
      onMuutos={onMuutos}
    />
  )
}
