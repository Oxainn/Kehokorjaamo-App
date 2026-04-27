import { useState, useEffect } from 'react'
import { haeKaynit } from '../lib/db'

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
                  {k.havainnot && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '11px', color: '#999', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Havainnot
                      </p>
                      {Object.entries(k.havainnot)
                        .filter(([, v]) => v && v !== '')
                        .map(([avain, arvo]) => (
                          <div key={avain} style={{ display: 'flex', gap: '8px', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{ fontSize: '12px', color: '#999', minWidth: '120px', textTransform: 'capitalize' }}>
                              {avain.replace(/_/g, ' ')}
                            </span>
                            <span style={{ fontSize: '12px', color: '#333', flex: 1 }}>
                              {arvo}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  )}

                  {k.loyodokset && Array.isArray(k.loyodokset) && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '11px', color: '#999', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Löydökset
                      </p>
                      {k.loyodokset.map((l, i) => (
                        <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0', fontSize: '12px', color: '#333' }}>
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
                      <p style={{ fontSize: '11px', color: '#999', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
