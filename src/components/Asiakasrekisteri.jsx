import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export default function Asiakasrekisteri({ onValitseAsiakas, onEsikatseluAsiakas, hoitajaId }) {
  const [asiakkaat, setAsiakkaat] = useState([])
  const [haku, setHaku]           = useState('')
  const [lataa, setLataa]         = useState(true)
  const [esitiedot, setEsitiedot] = useState([])

  useEffect(() => {
    const haeAsiakkaat = async () => {
      if (!hoitajaId) {
        console.log('hoitajaId puuttuu — odotetaan')
        setLataa(false)
        return
      }
      console.log('Haetaan hoitajaId:', hoitajaId)
      const { data, error } = await supabase
        .from('asiakkaat')
        .select('*')
        .eq('hoitaja_id', hoitajaId)
        .order('luotu', { ascending: false })
      console.log('Data:', data, 'Error:', error)
      if (!error) setAsiakkaat(data ?? [])
      setLataa(false)
    }
    haeAsiakkaat()
  }, [hoitajaId])

  useEffect(() => {
    const haeEsitiedot = async () => {
      const { data } = await supabase
        .from('esitiedot')
        .select()
        .eq('kasitelty', false)
        .order('created_at', { ascending: false })
      setEsitiedot(data ?? [])
    }
    haeEsitiedot()
    const interval = setInterval(haeEsitiedot, 10000)
    return () => clearInterval(interval)
  }, [])

  const suodatettu = asiakkaat.filter(a =>
    a.nimi?.toLowerCase().includes(haku.toLowerCase()) ||
    a.sahkoposti?.toLowerCase().includes(haku.toLowerCase())
  )

  const muotoilePvm = (iso) =>
    iso ? new Date(iso).toLocaleDateString('fi-FI') : null

  const avatarKirjain = (nimi) =>
    nimi?.trim()?.[0]?.toUpperCase() ?? '?'

  if (lataa) return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280', fontSize: '14px' }}>
      Haetaan asiakkaita...
    </div>
  )

  return (
    <section>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>
        Asiakasrekisteri
        <span style={{ fontSize: '13px', fontWeight: '400', color: '#9ca3af', marginLeft: '8px' }}>
          {asiakkaat.length} asiakasta
        </span>
      </h2>

      {/* Käsittelemättömät esitiedot */}
      {esitiedot.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#854F0B', marginBottom: '8px', margin: '0 0 8px' }}>
            🔔 Käsittelemättömät esitiedot ({esitiedot.length})
          </h3>
          {esitiedot.map(e => (
            <div key={e.id} style={{
              padding: '12px',
              border: '1px solid #FAC775',
              borderRadius: '8px',
              background: '#FAEEDA',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <p style={{ fontWeight: '500', fontSize: '13px', margin: '0 0 4px' }}>{e.nimi}</p>
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                  {[e.sahkoposti, e.palvelu].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => onEsikatseluAsiakas?.(e)}
                  style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #EF9F27', background: 'white', cursor: 'pointer' }}
                >
                  Esikatsele
                </button>
                <button
                  onClick={() => onValitseAsiakas?.(e)}
                  style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#1D9E75', color: 'white', cursor: 'pointer' }}
                >
                  Avaa asiakkaana
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        type="text"
        placeholder="Hae nimellä tai sähköpostilla..."
        value={haku}
        onChange={e => setHaku(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 14px', borderRadius: '10px',
          border: '1px solid #e2e8f0', fontSize: '14px',
          outline: 'none', marginBottom: '16px',
          background: 'white',
        }}
      />

      {suodatettu.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: '#9ca3af', fontSize: '14px', background: 'white', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
          {haku.trim() ? 'Ei hakutuloksia' : 'Ei asiakkaita vielä'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {suodatettu.map(a => (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px', borderRadius: '12px',
                background: 'white', border: '1px solid #e2e8f0',
              }}
            >
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                background: '#E1F5EE', color: '#085041',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '16px', flexShrink: 0,
              }}>
                {avatarKirjain(a.nimi)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.nimi}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[a.sahkoposti, a.puhelin].filter(Boolean).join(' · ') || '—'}
                </p>
                {a.luotu && (
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>
                    Lisätty: {muotoilePvm(a.luotu)}
                  </p>
                )}
              </div>

              <button
                onClick={() => onValitseAsiakas?.(a)}
                style={{
                  padding: '7px 16px', borderRadius: '20px',
                  border: 'none', background: '#1D9E75',
                  color: 'white', fontSize: '13px',
                  fontWeight: '500', cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Avaa
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
