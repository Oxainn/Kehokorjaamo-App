// Julkinen lomakenäkymä — asiakas saapuu tänne URL-parametrilla ?palvelu=ID
// ilman kirjautumista. Lataa Edge Function:in kautta palvelun + lomakkeen.
// Tallennus → Edge Function → Vello-välilehti → 6s auto-close kiitos-modaali.
//
// HUOM: magic link / portaalisähköposti on toistaiseksi pois käytöstä.
// Palautetaan kun Vaihe C (asiakasportaali) valmistuu.

import { useState, useEffect, useRef } from 'react'
import LomakeRenderoija from './lomake/runtime/LomakeRenderoija'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Kiitos-modaalin näyttöaika ennen automaattista sulkemista (ms).
const KIITOS_MS = 6000

const tilaTyyli = {
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'center',
  justifyContent: 'center',
  minHeight:      '60vh',
  padding:        '32px',
  textAlign:      'center',
}

// Modaalin overlay (kelluva, sulkee lomakkeen alle)
const overlayTyyli = {
  position:   'fixed',
  inset:      0,
  background: 'rgba(0, 0, 0, 0.6)',
  display:    'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding:    '16px',
  zIndex:     1000,
}

const modaaliTyyli = {
  background:    '#ecfdf5',
  border:        '1px solid #6ee7b7',
  borderRadius:  '20px',
  padding:       '32px 28px',
  maxWidth:      '480px',
  width:         '100%',
  color:         '#065f46',
  textAlign:     'center',
  boxShadow:     '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
}

const sulkeNappiTyyli = {
  marginTop:    '20px',
  padding:      '10px 24px',
  background:   'white',
  border:       '1px solid #6ee7b7',
  borderRadius: '10px',
  color:        '#065f46',
  fontSize:     '14px',
  fontWeight:   600,
  cursor:       'pointer',
}

export default function JulkinenLomake({ palveluId }) {
  const [tila,       setTila]       = useState('lataa') // lataa | valmis | virhe | tallentaa | onnistui
  const [palvelu,    setPalvelu]    = useState(null)
  const [rakenne,    setRakenne]    = useState(null)
  const [kentat,     setKentat]     = useState({})
  const [virhe,      setVirhe]      = useState(null)
  const [vastaukset, setVastaukset] = useState({})
  const ajastinRef = useRef(null)

  useEffect(() => {
    if (!palveluId) {
      setVirhe('Palvelua ei ole määritelty URL-osoitteessa. Käytä linkkiä joka näyttää muodolta ?palvelu=ID.')
      setTila('virhe')
      return
    }

    let peruttu = false
    setTila('lataa')
    fetch(`${SUPABASE_URL}/functions/v1/hae-julkinen-lomake?palveluId=${encodeURIComponent(palveluId)}`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    })
      .then((res) => res.json())
      .then((tulos) => {
        if (peruttu) return
        if (tulos.virhe) { setVirhe(tulos.virhe); setTila('virhe'); return }
        setPalvelu(tulos.palvelu)
        setRakenne(tulos.rakenne)
        setKentat(tulos.kentat)
        setTila('valmis')
      })
      .catch((e) => {
        if (!peruttu) {
          setVirhe(e.message ?? 'Lomakkeen lataus epäonnistui')
          setTila('virhe')
        }
      })
    return () => { peruttu = true }
  }, [palveluId])

  // Siivous: ajastin pitää siivota jos käyttäjä navigoi pois ennen sen laukeamista
  useEffect(() => {
    return () => {
      if (ajastinRef.current) clearTimeout(ajastinRef.current)
    }
  }, [])

  function suljeKiitos() {
    if (ajastinRef.current) {
      clearTimeout(ajastinRef.current)
      ajastinRef.current = null
    }
    // Tyhjennä lomake ja palauta lomakenäkymään — käyttäjä voi täyttää uudestaan
    // jos haluaa, tai sulkea välilehden.
    setVastaukset({})
    setTila('valmis')
  }

  async function lahetaLomake(arvot) {
    setTila('tallentaa')
    setVirhe(null)
    try {
      // 1. Tallenna Edge Function:in kautta
      const tallennusVastaus = await fetch(
        `${SUPABASE_URL}/functions/v1/tallenna-julkinen-lomake`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            hoitajaId:  palvelu.hoitaja_id,
            palveluId:  palvelu.id,
            vastaukset: arvot,
          }),
        }
      )
      const tallennusTulos = await tallennusVastaus.json()
      if (tallennusTulos.virhe) {
        setVirhe(tallennusTulos.virhe)
        setTila('virhe')
        return
      }

      // 2. Avaa varauslinkki uudessa välilehdessä jos asetettu
      if (palvelu.varauslinkki_url) {
        window.open(palvelu.varauslinkki_url, '_blank', 'noopener,noreferrer')
      }

      // 3. Näytä kiitos-modaali ja sulje 6 sekunnin kuluttua automaattisesti
      setTila('onnistui')
      ajastinRef.current = setTimeout(() => {
        ajastinRef.current = null
        setVastaukset({})
        setTila('valmis')
      }, KIITOS_MS)
    } catch (e) {
      console.error('[JulkinenLomake] Lähetys epäonnistui:', e)
      setVirhe(e.message ?? 'Lähetys epäonnistui')
      setTila('virhe')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (tila === 'lataa') {
    return <div style={tilaTyyli}><p style={{ color: '#6b7280', fontSize: '14px' }}>Ladataan lomaketta…</p></div>
  }

  if (tila === 'virhe' && !palvelu) {
    return (
      <div style={tilaTyyli}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '24px', maxWidth: '500px', color: '#991b1b' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Lomaketta ei voi näyttää</p>
          <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{virhe}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Palvelu-otsikko */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Asiakastietolomake
        </p>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
          {palvelu?.nimi}
        </h1>
        {palvelu?.kuvaus && (
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
            {palvelu.kuvaus}
          </p>
        )}
        {(palvelu?.kesto_min || palvelu?.hinta_eur != null) && (
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: '8px 0 0 0' }}>
            {palvelu.kesto_min && `${palvelu.kesto_min} min`}
            {palvelu.kesto_min && palvelu.hinta_eur != null && ' · '}
            {palvelu.hinta_eur != null && `${palvelu.hinta_eur} €`}
          </p>
        )}
      </div>

      {/* Tilaviestit */}
      {tila === 'tallentaa' && (
        <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#1e3a8a', marginBottom: '16px' }}>
          Lähetetään lomaketta…
        </div>
      )}
      {tila === 'virhe' && palvelu && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#991b1b', marginBottom: '16px' }}>
          <strong>Lähetys epäonnistui:</strong> {virhe}
        </div>
      )}

      {/* Lomake */}
      <LomakeRenderoija
        valmiitTiedot={{ rakenne, kentat }}
        vastaukset={vastaukset}
        onMuutos={setVastaukset}
        onLahetys={lahetaLomake}
      />

      {/* Kiitos-modaali — kelluva, auto-close 6s, manuaalinen sulkunappi */}
      {tila === 'onnistui' && (
        <div
          style={overlayTyyli}
          role="dialog"
          aria-modal="true"
          aria-labelledby="kiitos-otsikko"
          onClick={suljeKiitos}
        >
          <div style={modaaliTyyli} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '56px', lineHeight: 1, marginBottom: '12px' }}>✓</div>
            <p id="kiitos-otsikko" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
              Kiitos ennakkotiedoista!
            </p>
            <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
              Hoitaja on sinuun tarvittaessa yhteydessä ennen hoitoaikaasi.
            </p>
            <button type="button" onClick={suljeKiitos} style={sulkeNappiTyyli}>
              Sulje
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
