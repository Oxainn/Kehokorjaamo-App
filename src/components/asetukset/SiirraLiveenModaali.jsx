// Siirrä Liveen -modaali (D3) — vahvistuslista + lähetys Edge Functioniin.
//
// Kutsuu Kehitys-Supabasen Edge Functionia "siirra-liveen" käyttäjän
// JWT:llä. Edge Function vahvistaa että käyttäjä on admin (Oxa), tekee
// GitHub merge:n kehitys → main, ja kirjoittaa audit-rivin julkaisut-tauluun.

import { useState } from 'react'
import { supabase } from '../../services/supabase'

const muotoilePvm = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fi-FI', { dateStyle: 'short', timeStyle: 'short' })
}

const lyhytSha = (sha) => sha?.slice(0, 7) ?? ''

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

export default function SiirraLiveenModaali({ erot, onSulje, onValmis }) {
  const [testattu,        setTestattu]        = useState(false)
  const [eiHoitoa,        setEiHoitoa]        = useState(false)
  const [migraatiotOk,    setMigraatiotOk]    = useState(false)
  const [tila,            setTila]            = useState('idle')  // idle | lahetetaan | onnistui | virhe
  const [virhe,           setVirhe]           = useState(null)
  const [tulos,           setTulos]           = useState(null)

  const kaikkiVahvistettu = testattu && eiHoitoa && migraatiotOk
  const eroaKpl = erot?.length ?? 0

  async function julkaise() {
    setTila('lahetetaan')
    setVirhe(null)
    try {
      // Edge Function vaatii sekä vahvistukset.migraatiot_ok että erillisen
      // migraatiot_ajettu_kasin-lipun. Käyttäjälle nämä ovat sama asia
      // (kolmas checkbox), joten asetetaan molemmat samaan boolean-arvoon.
      // Ilman tätä yhdistämistä Edge Function palauttaa 400:n.
      const body = {
        vahvistukset: {
          testattu,
          ei_hoitoa:     eiHoitoa,
          migraatiot_ok: migraatiotOk,
        },
        migraatiot_ajettu_kasin: migraatiotOk,
      }
      const { data, error } = await supabase.functions.invoke('siirra-liveen', { body })
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
      // Ilmoita vanhemmalle että erot-lista pitää päivittää
      setTimeout(() => onValmis?.(), 1500)
    } catch (e) {
      setVirhe(e.message ?? 'Verkkovirhe')
      setTila('virhe')
    }
  }

  const lukittu = tila === 'lahetetaan' || tila === 'onnistui'

  return (
    <div style={overlayTyyli} onClick={(e) => { if (e.target === e.currentTarget && !lukittu) onSulje() }}>
      <div style={modaaliTyyli}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
          🚀 Siirrä Kehitys → Live?
        </h2>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
          Tämä yhdistää kehitys-haaran main-haaraan GitHubissa.
          Vercel deployaa Liven automaattisesti ~1-2 minuutin sisällä.
        </p>

        {/* Lista commiteja */}
        <div style={{
          background:   '#f9fafb',
          border:       '1px solid #e5e7eb',
          borderRadius: '10px',
          padding:      '12px 14px',
          maxHeight:    '200px',
          overflowY:    'auto',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
            Julkaistavat commitit ({eroaKpl} kpl):
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {(erot ?? []).map((c) => (
              <li key={c.sha} style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: '8px', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'monospace', color: '#6b7280' }}>{lyhytSha(c.sha)}</span>
                <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.viesti}>
                  {c.viesti}
                </span>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>{muotoilePvm(c.pvm)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Migraatiot — tämä versio EI aja niitä automaattisesti */}
        <div style={{
          background:   '#fffbeb',
          border:       '1px solid #fcd34d',
          borderRadius: '10px',
          padding:      '12px 14px',
          fontSize:     '12px',
          color:        '#78350f',
          lineHeight:   1.5,
        }}>
          <strong>📋 DB-migraatiot:</strong> Ensimmäinen versio EI aja DB-migraatioita
          automaattisesti. Jos kehitys-haarassa on uusia <code>supabase/migrations/</code>-
          tiedostoja, sinun pitää ajaa ne käsin Supabase MCP:llä Live-DB:hen
          ENNEN tämän nappin painamista. Rastittamalla "Olen tarkistanut migraatiot"
          vahvistat että olet tehnyt tämän.
        </div>

        {/* 3 vahvistus-checkboxia */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Checkbox
            checked={testattu}
            onChange={setTestattu}
            disabled={lukittu}
            label="Olen testannut kehitys-puolella ja muutos toimii"
          />
          <Checkbox
            checked={eiHoitoa}
            onChange={setEiHoitoa}
            disabled={lukittu}
            label="Olen varma ettei minulla ole hoitokertaa menossa nyt"
          />
          <Checkbox
            checked={migraatiotOk}
            onChange={setMigraatiotOk}
            disabled={lukittu}
            label="Olen tarkistanut migraatiot ja ajanut ne käsin (tai niitä ei ole)"
          />
        </div>

        {/* Tilakohtaiset viestit */}
        {tila === 'lahetetaan' && (
          <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#1e40af' }}>
            ⏳ Yhdistetään kehitys → main… Älä sulje ikkunaa.
          </div>
        )}
        {tila === 'onnistui' && tulos && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#166534' }}>
            ✓ Onnistui! Vercel deployaa Liven nyt.<br />
            Merge SHA: <code style={{ fontFamily: 'monospace' }}>{lyhytSha(tulos.mergeSha)}</code><br />
            Julkaistu {tulos.committeja} commit{tulos.committeja === 1 ? '' : 'tia'}.
          </div>
        )}
        {tila === 'virhe' && virhe && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#991b1b', whiteSpace: 'pre-wrap' }}>
            ✗ {virhe}
          </div>
        )}

        {/* Napit */}
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
              onClick={julkaise}
              disabled={!kaikkiVahvistettu || lukittu}
              style={{
                padding:      '10px 18px',
                borderRadius: '10px',
                border:       'none',
                background:   kaikkiVahvistettu && !lukittu ? '#1D9E75' : '#9ca3af',
                color:        'white',
                fontSize:     '14px',
                fontWeight:   600,
                cursor:       kaikkiVahvistettu && !lukittu ? 'pointer' : 'not-allowed',
                opacity:      kaikkiVahvistettu && !lukittu ? 1 : 0.6,
              }}
            >
              {tila === 'lahetetaan' ? 'Yhdistetään…' : '🚀 Julkaise'}
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
