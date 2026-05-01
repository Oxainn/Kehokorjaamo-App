// Julkinen lomakenäkymä — asiakas saapuu tänne URL-parametrilla ?palvelu=ID
// ilman kirjautumista. Lataa Edge Function:in kautta palvelun + oletuspohjan.
// Tallennus → Edge Function → magic link sähköpostissa → Vello-välilehti.

import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import LomakeRenderoija from './lomake/runtime/LomakeRenderoija'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const tilaTyyli = {
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'center',
  justifyContent: 'center',
  minHeight:      '60vh',
  padding:        '32px',
  textAlign:      'center',
}

export default function JulkinenLomake({ palveluId }) {
  const [tila,       setTila]       = useState('lataa') // lataa | valmis | virhe | tallentaa | onnistui
  const [palvelu,    setPalvelu]    = useState(null)
  const [rakenne,    setRakenne]    = useState(null)
  const [kentat,     setKentat]     = useState({})
  const [virhe,      setVirhe]      = useState(null)
  const [vastaukset, setVastaukset] = useState({})
  // Tallennetaan onnistumisen jälkeen jotta Kiitos-näkymä voi kertoa
  // todenmukaisen viestin (sähköposti voi puuttua, varauslinkkiä ei aina ole).
  const [tallennusTulos, setTallennusTulos] = useState({ sahkopostiAnnettu: false, varauslinkki: null })

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

      // 2. Lähetä passwordless-kirjautumislinkki sähköpostiin (jos sähköposti annettu)
      const sahkoposti = arvot.sahkoposti
      let sahkopostiLahetetty = false
      if (sahkoposti && sahkoposti.trim()) {
        const { error: otpVirhe } = await supabase.auth.signInWithOtp({
          email: sahkoposti.trim(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo:  `${window.location.origin}/portaali`,
          },
        })
        if (otpVirhe) {
          // Magic linkin lähetys epäonnistui mutta tallennus onnistui — älä kaada
          console.warn('[JulkinenLomake] Magic linkin lähetys epäonnistui:', otpVirhe.message)
        } else {
          sahkopostiLahetetty = true
        }
      }

      // 3. Avaa Vello uudessa välilehdessä jos varauslinkki on asetettu
      const varauslinkki = palvelu.varauslinkki_url ?? null
      if (varauslinkki) {
        window.open(varauslinkki, '_blank', 'noopener,noreferrer')
      }

      setTallennusTulos({ sahkopostiAnnettu: sahkopostiLahetetty, varauslinkki })
      setTila('onnistui')
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

  if (tila === 'onnistui') {
    const paaviesti = tallennusTulos.varauslinkki
      ? 'Lomake tallennettu ja varaussivu avautui uudessa välilehdessä.'
      : 'Lomake tallennettu. Hoitaja ottaa sinuun yhteyttä ajan sopimiseksi.'
    return (
      <div style={tilaTyyli}>
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '16px', padding: '32px', maxWidth: '560px', color: '#065f46' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>✓</div>
          <p style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Kiitos!</p>
          <p style={{ fontSize: '15px', lineHeight: 1.6, marginBottom: '12px' }}>
            {paaviesti}
          </p>
          {tallennusTulos.sahkopostiAnnettu && (
            <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
              Lähetimme sähköpostiisi kirjautumistunnukset asiakasportaaliin —
              siellä näet hoitohistoriasi ja voit varata jatkohoitoja ilman uutta lomaketta.
            </p>
          )}
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
    </div>
  )
}
