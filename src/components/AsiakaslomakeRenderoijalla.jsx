// Tuotantokomponentti: lataa oletuspohjan, renderöi lomakkeen, tallentaa Supabaseen.
// Käytetään App.jsx:n näkymissä 'kaynti' (olemassa olevaan asiakkaaseen) ja 'uusi-kaynti' (uusi asiakas).
import { useState, useEffect } from 'react'
import { haeOletusLomakepohjaId, tallennaRenderoijastaLomake, vahvistaAsiakas } from '../lib/db'
import LomakeRenderoija from './lomake/runtime/LomakeRenderoija'

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
  const [vahvistaaTila, setVahvistaaTila] = useState('idle') // idle | vahvistaa | onnistui | epaonnistui

  const onVahvistamaton = asiakas?.vahvistettu === false
  const asiakasId       = asiakas?.id ?? asiakas?.supabase_id ?? null

  async function vahvista() {
    if (!asiakasId) return
    setVahvistaaTila('vahvistaa')
    const tulos = await vahvistaAsiakas(asiakasId)
    if (tulos.virhe) {
      setVahvistaaTila('epaonnistui')
      setVirheviesti(tulos.virhe)
      return
    }
    setVahvistaaTila('onnistui')
    setTimeout(onValmis, 1200)
  }

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
      {/* Korostettu palkki uuden, vahvistamattoman asiakkaan kohdalla */}
      {onVahvistamaton && (
        <div style={{
          background:    '#fffbeb',
          border:        '1.5px solid #f59e0b',
          borderRadius:  '12px',
          padding:       '16px 20px',
          display:       'flex',
          flexDirection: 'column',
          gap:           '12px',
        }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>
              🔔 Uusi asiakas — odottaa vahvistusta
            </p>
            <p style={{ fontSize: '13px', color: '#78350f', margin: 0, lineHeight: 1.5 }}>
              Asiakas täytti lomakkeen julkisen linkin kautta. Tarkista alla olevat tiedot ja paina
              "Tallenna asiakas" lisätäksesi hänet asiakaslistaan.
            </p>
          </div>
          {vahvistaaTila === 'onnistui' ? (
            <div style={ilmoitusTyyli('onnistui')}>
              <strong>✓ Asiakas tallennettu.</strong> Palataan rekisteriin…
            </div>
          ) : (
            <button
              type="button"
              onClick={vahvista}
              disabled={vahvistaaTila === 'vahvistaa'}
              style={{
                width:        '100%',
                minHeight:    '52px',
                borderRadius: '12px',
                border:       'none',
                background:   '#1D9E75',
                color:        'white',
                fontSize:     '15px',
                fontWeight:   700,
                letterSpacing: '0.03em',
                cursor:       vahvistaaTila === 'vahvistaa' ? 'wait' : 'pointer',
                opacity:      vahvistaaTila === 'vahvistaa' ? 0.7 : 1,
              }}
            >
              {vahvistaaTila === 'vahvistaa' ? 'Tallennetaan…' : '✓ Tallenna asiakas'}
            </button>
          )}
        </div>
      )}

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
    </div>
  )
}
