// Rollback-modaali (D5) — palauta edellinen Live-versio Vercelin kautta.

import { useState } from 'react'
import { supabase } from '../../services/supabase'

const overlayTyyli = {
  position:       'fixed',
  inset:          0,
  background:     'rgba(0, 0, 0, 0.6)',
  display:        'flex',
  alignItems:     'flex-start',
  justifyContent: 'center',
  padding:        '24px',
  zIndex:         1000,
  overflowY:      'auto',
}

const modaaliTyyli = {
  background:    'white',
  borderRadius:  '16px',
  width:         '100%',
  maxWidth:      '600px',
  margin:        '40px auto',
  boxShadow:     '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  display:       'flex',
  flexDirection: 'column',
  gap:           '16px',
  padding:       '24px',
}

export default function RollbackModaali({ liveCommit, onSulje, onValmis }) {
  const [ymmarretty,    setYmmarretty]    = useState(false)
  const [eiHoitoa,      setEiHoitoa]      = useState(false)
  const [otettuYhteytta, setOtettuYhteytta] = useState(false)
  const [tila,          setTila]          = useState('idle')
  const [virhe,         setVirhe]         = useState(null)
  const [tulos,         setTulos]         = useState(null)

  const kaikkiVahvistettu = ymmarretty && eiHoitoa && otettuYhteytta
  const lukittu = tila === 'lahetetaan' || tila === 'onnistui'

  async function palauta() {
    setTila('lahetetaan')
    setVirhe(null)
    try {
      const { data, error } = await supabase.functions.invoke('palauta-edellinen-live', {
        body: {
          vahvistukset: { ymmarretty, ei_hoitoa: eiHoitoa, otettu_yhteytta: otettuYhteytta },
        },
      })
      if (error) {
        setVirhe(`Edge Function-virhe: ${error.message ?? error}`)
        setTila('virhe')
        return
      }
      if (!data?.onnistui) {
        setVirhe(data?.virhe ?? 'Tuntematon virhe')
        setTila('virhe')
        return
      }
      setTulos(data)
      setTila('onnistui')
      setTimeout(() => onValmis?.(), 1500)
    } catch (e) {
      setVirhe(e.message ?? 'Verkkovirhe')
      setTila('virhe')
    }
  }

  return (
    <div style={overlayTyyli} onClick={(e) => { if (e.target === e.currentTarget && !lukittu) onSulje() }}>
      <div style={modaaliTyyli}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626', margin: 0 }}>
          ↩ Palauta edellinen Live-versio?
        </h2>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
          Tämä peruuttaa nykyisen Live-deploymentin ja palauttaa edellisen
          Vercelin kautta. Asiakkaat näkevät vanhan version välittömästi.
        </p>

        {/* Nykyinen Live-commit joka perutaan */}
        {liveCommit && (
          <div style={{
            background:   '#fef2f2',
            border:       '1px solid #fecaca',
            borderRadius: '10px',
            padding:      '12px 14px',
            fontSize:     '13px',
            color:        '#991b1b',
          }}>
            <p style={{ fontWeight: 600, margin: '0 0 4px' }}>Peruttava versio:</p>
            <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px' }}>
              {liveCommit.sha?.slice(0, 7)} — {liveCommit.viesti}
            </p>
          </div>
        )}

        <div style={{
          background:   '#fffbeb',
          border:       '1px solid #fcd34d',
          borderRadius: '10px',
          padding:      '12px 14px',
          fontSize:     '12px',
          color:        '#78350f',
          lineHeight:   1.5,
        }}>
          <strong>⚠ Huom:</strong> Rollback peruu vain Vercel-deploymentin.
          Jos uusi versio sisälsi DB-migraatioita, ne pysyvät Live-DB:ssä —
          rollback EI peru DB-muutoksia. Jos DB-skeemamuutos on syy
          ongelmaan, joudut peruuttamaan migraation käsin.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Checkbox
            checked={ymmarretty}
            onChange={setYmmarretty}
            disabled={lukittu}
            label="Ymmärrän että rollback peruu vain Vercel-deploymentin (ei DB-muutoksia)"
          />
          <Checkbox
            checked={eiHoitoa}
            onChange={setEiHoitoa}
            disabled={lukittu}
            label="Olen varma ettei minulla ole hoitokertaa menossa nyt"
          />
          <Checkbox
            checked={otettuYhteytta}
            onChange={setOtettuYhteytta}
            disabled={lukittu}
            label="Olen ottanut yhteyttä mahdollisiin asiakkaisiin jos tarpeen"
          />
        </div>

        {tila === 'lahetetaan' && (
          <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#1e40af' }}>
            ⏳ Pyydetään Vercelin promote… Älä sulje ikkunaa.
          </div>
        )}
        {tila === 'onnistui' && tulos && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#166534' }}>
            ✓ Rollback onnistui! Edellinen Live-versio on jälleen tuotannossa.<br />
            Palautettu deployment: <code>{tulos.vercelDeployId?.slice(0, 12)}…</code>
          </div>
        )}
        {tila === 'virhe' && virhe && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#991b1b', whiteSpace: 'pre-wrap' }}>
            ✗ {virhe}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onSulje}
            disabled={tila === 'lahetetaan'}
            style={{
              padding:      '10px 18px',
              borderRadius: '10px',
              border:       '1px solid #e5e7eb',
              background:   'white',
              color:        '#374151',
              fontSize:     '14px',
              fontWeight:   500,
              cursor:       tila === 'lahetetaan' ? 'not-allowed' : 'pointer',
              opacity:      tila === 'lahetetaan' ? 0.5 : 1,
            }}
          >
            {tila === 'onnistui' ? 'Sulje' : 'Peru'}
          </button>
          {tila !== 'onnistui' && (
            <button
              type="button"
              onClick={palauta}
              disabled={!kaikkiVahvistettu || lukittu}
              style={{
                padding:      '10px 18px',
                borderRadius: '10px',
                border:       'none',
                background:   kaikkiVahvistettu && !lukittu ? '#dc2626' : '#9ca3af',
                color:        'white',
                fontSize:     '14px',
                fontWeight:   600,
                cursor:       kaikkiVahvistettu && !lukittu ? 'pointer' : 'not-allowed',
                opacity:      kaikkiVahvistettu && !lukittu ? 1 : 0.6,
              }}
            >
              {tila === 'lahetetaan' ? 'Palautetaan…' : '↩ Palauta'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Checkbox({ checked, onChange, label, disabled }) {
  return (
    <label style={{
      display:    'flex',
      alignItems: 'flex-start',
      gap:        '8px',
      cursor:     disabled ? 'not-allowed' : 'pointer',
      fontSize:   '13px',
      color:      '#374151',
      lineHeight: 1.4,
      opacity:    disabled ? 0.6 : 1,
    }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: '3px' }}
      />
      <span>{label}</span>
    </label>
  )
}
