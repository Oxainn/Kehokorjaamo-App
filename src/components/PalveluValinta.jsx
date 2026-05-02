// Julkinen palveluvalintasivu — asiakas tulee kotisivulta /uusi-asiakas-reitille,
// valitsee palvelun korttinäkymästä ja ohjautuu palvelun lomakkeeseen.
//
// Lataa Edge Function:in kautta vain aktiiviset palvelut joilla on aktiivinen
// lomakepohja. Sivu on julkinen — ei kirjautumista, ei evästeitä.

import { useState, useEffect } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function PalveluValinta() {
  const [palvelut, setPalvelut] = useState([])
  const [tila,     setTila]     = useState('lataa') // lataa | valmis | virhe | tyhja
  const [virhe,    setVirhe]    = useState(null)

  useEffect(() => {
    let peruttu = false
    setTila('lataa')

    fetch(`${SUPABASE_URL}/functions/v1/hae-julkiset-palvelut`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    })
      .then((res) => res.json())
      .then((tulos) => {
        if (peruttu) return
        if (tulos.virhe) {
          setVirhe(tulos.virhe)
          setTila('virhe')
          return
        }
        const lista = tulos.palvelut ?? []
        setPalvelut(lista)
        setTila(lista.length === 0 ? 'tyhja' : 'valmis')
      })
      .catch((e) => {
        if (!peruttu) {
          setVirhe(e.message ?? 'Palvelujen lataus epäonnistui')
          setTila('virhe')
        }
      })

    return () => { peruttu = true }
  }, [])

  function valitsePalvelu(id) {
    window.location.href = `/?palvelu=${encodeURIComponent(id)}`
  }

  return (
    <div className="lista-leveys" style={{ padding: '32px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '28px', fontWeight: 700, color: '#111827',
          margin: '0 0 12px 0', letterSpacing: '-0.02em',
        }}>
          Tervetuloa! Valitse palvelu jolle varaat aikaa
        </h1>
        <p style={{
          fontSize: '15px', color: '#4b5563',
          maxWidth: '560px', margin: '0 auto', lineHeight: 1.6,
        }}>
          Valitsemasi palvelun lomake aukeaa seuraavaksi. Vastaa kysymyksiin
          huolellisesti — saat ne valmiiksi ennen tapaamista.
        </p>
      </div>

      {tila === 'lataa' && (
        <p className="lataauspulse" style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', padding: '32px' }}>
          Ladataan palveluja…
        </p>
      )}

      {tila === 'virhe' && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '12px', padding: '20px', maxWidth: '500px',
          margin: '0 auto', color: '#991b1b', textAlign: 'center',
        }}>
          <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
            Palveluja ei voitu ladata
          </p>
          <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>{virhe}</p>
        </div>
      )}

      {tila === 'tyhja' && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: '12px', padding: '24px', maxWidth: '500px',
          margin: '0 auto', color: '#78350f', textAlign: 'center',
        }}>
          <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
            Ei vielä varattavissa olevia palveluja
          </p>
          <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
            Hoitaja ei ole vielä julkaissut palveluja varauksia varten. Yritä
            myöhemmin uudestaan tai ota yhteyttä suoraan.
          </p>
        </div>
      )}

      {tila === 'valmis' && (
        <ul style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap:                 '16px',
          listStyle:           'none',
          padding:             0,
          margin:              0,
        }}>
          {palvelut.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => valitsePalvelu(p.id)}
                style={{
                  width:         '100%',
                  textAlign:     'left',
                  background:    'white',
                  border:        '1.5px solid #e5e7eb',
                  borderRadius:  '16px',
                  padding:       '20px',
                  cursor:        'pointer',
                  transition:    'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
                  display:       'flex',
                  flexDirection: 'column',
                  gap:           '12px',
                  minHeight:     '160px',
                  boxShadow:     '0 1px 3px rgba(0, 0, 0, 0.04)',
                  fontFamily:    'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1D9E75'
                  e.currentTarget.style.boxShadow   = '0 4px 12px rgba(29, 158, 117, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.boxShadow   = '0 1px 3px rgba(0, 0, 0, 0.04)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '17px', fontWeight: 700, color: '#111827',
                    margin: '0 0 8px 0', lineHeight: 1.3,
                  }}>
                    {p.nimi}
                  </h3>
                  {p.kuvaus && (
                    <p style={{
                      fontSize: '13px', color: '#6b7280',
                      margin: 0, lineHeight: 1.5,
                    }}>
                      {p.kuvaus}
                    </p>
                  )}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: '12px', borderTop: '1px solid #f3f4f6',
                }}>
                  <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                    {[
                      p.kesto_min ? `${p.kesto_min} min` : null,
                      p.hinta_eur != null ? `${p.hinta_eur} €` : null,
                    ].filter(Boolean).join(' · ') || '—'}
                  </span>
                  <span style={{
                    fontSize: '13px', color: '#1D9E75', fontWeight: 600,
                  }}>
                    Valitse →
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
