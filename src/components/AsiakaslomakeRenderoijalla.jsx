// Tuotantokomponentti: lataa oletuspohjan, renderöi lomakkeen, tallentaa Supabaseen.
// Käytetään App.jsx:n näkymissä 'kaynti' (olemassa olevaan asiakkaaseen) ja 'uusi-kaynti' (uusi asiakas).
//
// HUOM: Tätä komponenttia EI saa käyttää vahvistamattomille asiakkaille
// (asiakas.vahvistettu === false) — heille on UudenAsiakkaanTarkistus-näkymä.
// Tällä komponentilla on aina LomakeRenderoija + "Lähetä lomake" -nappi joka
// luo uuden lomakeversion ja sulkee aiemmat. Vahvistamattoman asiakkaan
// kohdalla tämä korvasi asiakkaan jo täyttämän alkuperäisen tiedon
// tyhjällä versiolla — siksi App.jsx ohjaa nyt vahvistamattomat suoraan
// UudenAsiakkaanTarkistus:een.
import { useState, useEffect } from 'react'
import { haeOletusLomakepohjaId, tallennaRenderoijastaLomake, haeAsiakkaanViimeisinLomake } from '../lib/db'
import { kokoaVastaukset } from '../lib/lomakeTallennus'
import LomakeRenderoija from './lomake/runtime/LomakeRenderoija'
import Kayntihistoria from './Kayntihistoria'

const TILA = {
  TYHJA:        'tyhja',
  TALLENTAA:    'tallentaa',
  ONNISTUI:     'onnistui',
  EPAONNISTUI:  'epaonnistui',
}

const ilmoitusTyyli = (sävy) => ({
  background:   sävy === 'tieto' ? '#eff6ff' : sävy === 'onnistui' ? '#ecfdf5' : '#fef2f2',
  border:       sävy === 'tieto' ? '1px solid #93c5fd' : sävy === 'onnistui' ? '1px solid #6ee7b7' : '1px solid #fecaca',
  color:        sävy === 'tieto' ? '#1e3a8a' : sävy === 'onnistui' ? '#065f46' : '#991b1b',
  borderRadius: '12px',
  padding:      '12px 16px',
  fontSize:     '13px',
  lineHeight:   1.5,
})

export default function AsiakaslomakeRenderoijalla({ asiakas = null, onValmis = () => {} }) {
  const [pohjaId,    setPohjaId]    = useState(null)
  const [vastaukset, setVastaukset] = useState({})
  const [tila,       setTila]       = useState(TILA.TYHJA)
  const [virheviesti, setVirheviesti] = useState(null)
  const [pohjaVirhe, setPohjaVirhe] = useState(null)

  useEffect(() => {
    let peruttu = false
    haeOletusLomakepohjaId()
      .then((id) => {
        if (peruttu) return
        if (!id) setPohjaVirhe('Oletuspohjaa ei löytynyt — luo lomakepohja Asetuksissa.')
        else setPohjaId(id)
      })
      .catch((e) => { if (!peruttu) setPohjaVirhe(e.message ?? 'Pohjan haku epäonnistui') })
    return () => { peruttu = true }
  }, [])

  // Esitäyttö: kun avataan olemassa oleva asiakas, kerää nykyinen lomakedata
  // (asiakkaat-rivi + voimassa oleva lomakeversio + sairaudet) ja täytä
  // renderöijän kentät. Tämä mahdollistaa lomakkeen päivittämisen ajan
  // mittaan eikä joka tallennus tyhjästä.
  const asiakasId = asiakas?.id ?? asiakas?.supabase_id ?? null
  useEffect(() => {
    if (!asiakasId) {
      setVastaukset({})
      return
    }
    let peruttu = false
    haeAsiakkaanViimeisinLomake(asiakasId)
      .then(({ versio, sairausIdit }) => {
        if (peruttu) return
        setVastaukset(kokoaVastaukset(asiakas, versio, sairausIdit))
      })
      .catch((e) => {
        if (peruttu) return
        console.warn('[AsiakaslomakeRenderoijalla] Esitäyttö epäonnistui:', e)
        // Jätä vastaukset tyhjäksi — käyttäjä voi täyttää kentät manuaalisesti
        setVastaukset(kokoaVastaukset(asiakas, null, []))
      })
    return () => { peruttu = true }
  }, [asiakasId])

  async function tallenna(arvot) {
    setTila(TILA.TALLENTAA)
    setVirheviesti(null)
    try {
      const tulos = await tallennaRenderoijastaLomake({
        vastaukset:           arvot,
        asiakasIdJosOlemassa: asiakas?.id ?? null,
      })
      if (tulos.virhe) {
        setTila(TILA.EPAONNISTUI)
        setVirheviesti(tulos.virhe)
        return
      }
      setTila(TILA.ONNISTUI)
      // Lyhyt viive jotta käyttäjä näkee onnistumisilmoituksen
      setTimeout(onValmis, 1200)
    } catch (e) {
      setTila(TILA.EPAONNISTUI)
      setVirheviesti(e.message ?? 'Tuntematon virhe')
    }
  }

  if (pohjaVirhe) {
    return <div style={ilmoitusTyyli('virhe')}>{pohjaVirhe}</div>
  }
  if (!pohjaId) {
    return <div style={{ padding: '24px', color: '#6b7280', fontSize: '14px' }}>Ladataan lomakepohjaa…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {tila === TILA.TALLENTAA && (
        <div style={ilmoitusTyyli('tieto')}>Tallennetaan…</div>
      )}
      {tila === TILA.ONNISTUI && (
        <div style={ilmoitusTyyli('onnistui')}>
          <strong>✓ Lomake tallennettu.</strong> Palataan rekisteriin…
        </div>
      )}
      {tila === TILA.EPAONNISTUI && (
        <div style={ilmoitusTyyli('virhe')}>
          <strong>✗ Tallennus epäonnistui</strong>
          <p style={{ margin: '4px 0 0 0' }}>{virheviesti}</p>
        </div>
      )}

      <LomakeRenderoija
        pohjaId={pohjaId}
        vastaukset={vastaukset}
        onMuutos={setVastaukset}
        onLahetys={tallenna}
      />

      {/* Käyntihistoria — näytetään vain jos asiakkaalla on suljettuja versioita */}
      {asiakas && <Kayntihistoria asiakas={asiakas} />}
    </div>
  )
}
