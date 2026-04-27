import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export default function Asiakasrekisteri({ onValitseAsiakas, hoitajaId }) {
  const [asiakkaat, setAsiakkaat] = useState([])
  const [haku, setHaku]           = useState('')
  const [lataa, setLataa]         = useState(true)

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
        .order('created_at', { ascending: false })
      console.log('Data:', data, 'Error:', error)
      if (!error) setAsiakkaat(data ?? [])
      setLataa(false)
    }
    haeAsiakkaat()
  }, [hoitajaId])

  const suodatettu = asiakkaat.filter(a =>
    a.nimi?.toLowerCase().includes(haku.toLowerCase()) ||
    a.sahkoposti?.toLowerCase().includes(haku.toLowerCase())
  )

  const viimeisinKaynti = (a) => {
    const pvmLista = a.hoitokaynit?.map(k => k.pvm).filter(Boolean) ?? []
    if (!pvmLista.length) return null
    return pvmLista.sort().at(-1)
  }

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
          {suodatettu.map(a => {
            const viimKaynti = viimeisinKaynti(a)
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '12px',
                  background: 'white', border: '1px solid #e2e8f0',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  background: '#E1F5EE', color: '#085041',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700', fontSize: '16px', flexShrink: 0,
                }}>
                  {avatarKirjain(a.nimi)}
                </div>

                {/* Tiedot */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.nimi}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[a.sahkoposti, a.puhelin].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {viimKaynti && (
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>
                      Viimeisin käynti: {muotoilePvm(viimKaynti)}
                    </p>
                  )}
                </div>

                {/* Avaa-nappi */}
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
            )
          })}
        </div>
      )}
    </section>
  )
}
