import { useState, useEffect } from 'react'
import { haeKaynit } from '../lib/db'

const renderArvo = (arvo) => {
  if (typeof arvo === 'boolean')
    return arvo ? 'Kyllä' : 'Ei'
  if (typeof arvo === 'object' && arvo !== null)
    return Object.entries(arvo)
      .filter(([, v]) => v && v !== false)
      .map(([k, v]) => `${k}: ${typeof v === 'boolean' ? (v ? 'kyllä' : 'ei') : v}`)
      .join(', ')
  return arvo
}

export default function AsiakasHistoria({ asiakas }) {
  const [kaynit, setKaynit]           = useState([])
  const [lataa, setLataa]             = useState(true)
  const [avattuKaynti, setAvattuKaynti] = useState(null)

  useEffect(() => {
    if (asiakas?.supabase_id) {
      haeKaynit(asiakas.supabase_id).then(data => {
        setKaynit(data)
        setLataa(false)
      })
    } else {
      setLataa(false)
    }
  }, [asiakas?.supabase_id])

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">
          Hoitohistoria{asiakas?.nimi ? ` — ${asiakas.nimi}` : ''}
        </h2>
      </div>

      {lataa ? (
        <p style={{ fontSize: '14px', color: '#666' }}>Ladataan...</p>
      ) : kaynit.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#999', textAlign: 'center', padding: '32px 0' }}>
          Ei aiempia käyntejä
        </p>
      ) : (
        <div>
          {kaynit.map(k => (
            <div
              key={k.id}
              onClick={() => setAvattuKaynti(avattuKaynti?.id === k.id ? null : k)}
              style={{
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                marginBottom: '8px',
                cursor: 'pointer',
                background: 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500', fontSize: '13px' }}>
                  {new Date(k.pvm).toLocaleDateString('fi-FI')}
                </span>
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {avattuKaynti?.id === k.id ? '▲' : '▼'}
                </span>
              </div>

              {avattuKaynti?.id === k.id && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px' }}>
                    {new Date(k.pvm).toLocaleString('fi-FI')}
                  </p>

                  {k.havainnot && typeof k.havainnot === 'object' && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '11px', fontWeight: '500', color: '#666', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Havainnot
                      </p>
                      {Object.entries(k.havainnot)
                        .filter(([, v]) => {
                          if (!v) return false
                          if (typeof v === 'object') return Object.values(v).some(x => x && x !== false)
                          return v !== ''
                        })
                        .map(([avain, arvo]) => (
                          <div key={avain} style={{ display: 'flex', gap: '8px', padding: '4px 0', fontSize: '12px', borderBottom: '1px solid #f5f5f5' }}>
                            <span style={{ color: '#999', minWidth: '140px', textTransform: 'capitalize' }}>
                              {avain.replace(/_/g, ' ')}
                            </span>
                            <span style={{ color: '#333', flex: 1 }}>
                              {renderArvo(arvo)}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  )}

                  {k.loyodokset && Array.isArray(k.loyodokset) && k.loyodokset.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '11px', fontWeight: '500', color: '#666', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Löydökset
                      </p>
                      {k.loyodokset.map((l, i) => (
                        <div key={i} style={{ padding: '3px 0', fontSize: '12px', color: '#333' }}>
                          <span style={{ fontWeight: '500' }}>{l.alue}</span>
                          {l.kallistus && ` — kallistus ${l.kallistus}`}
                          {l.kierto && ` — kierto ${l.kierto}`}
                          {l.kipu > 0 && ` — VAS ${l.kipu}`}
                        </div>
                      ))}
                    </div>
                  )}

                  {k.kuva_analyysit?.length > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: '500', color: '#666', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Kuva-analyysit ({k.kuva_analyysit.length} mittausta)
                      </p>
                      {k.kuva_analyysit.map((m, i) => (
                        <p key={i} style={{ fontSize: '12px', color: '#374151', margin: '2px 0' }}>
                          {m.tyyppi}: {m.kulma?.teksti}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
