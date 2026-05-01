// Arkistoi asiakas -nappi + in-app vahvistusmodaali. Yhdistetty komponentti
// jotta sama UI on käytettävissä sekä AsiakaslomakeRenderoijalla:lla
// (vahvistettu asiakas) että UudenAsiakkaanTarkistus:ssa (vahvistamaton).
//
// Pehmeä poisto: asiakkaan tiedot säilyvät DB:ssä lakisääteistä 6 v
// säilytysaikaa varten, mutta hän siirtyy "Arkisto"-näkymään josta
// voidaan palauttaa.

import { useState, useEffect } from 'react'
import { arkistoiAsiakas } from '../lib/db'

export default function ArkistoiNappi({ asiakas, onArkistoitu }) {
  const [auki,        setAuki]        = useState(false)
  const [arkistoidaan, setArkistoidaan] = useState(false)
  const [virhe,       setVirhe]       = useState(null)

  // Esc sulkee modaalin
  useEffect(() => {
    if (!auki) return
    const onKey = (e) => { if (e.key === 'Escape') setAuki(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [auki])

  async function vahvista() {
    if (!asiakas?.id) return
    setArkistoidaan(true)
    setVirhe(null)
    const tulos = await arkistoiAsiakas(asiakas.id)
    setArkistoidaan(false)
    if (tulos.virhe) {
      setVirhe(tulos.virhe)
      return
    }
    setAuki(false)
    onArkistoitu?.()
  }

  if (!asiakas?.id) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setAuki(true)}
        style={{
          width:        '100%',
          padding:      '12px 16px',
          marginTop:    '12px',
          borderRadius: '10px',
          border:       '1px solid #e5e7eb',
          background:   '#f9fafb',
          color:        '#6b7280',
          fontSize:     '14px',
          fontWeight:   500,
          cursor:       'pointer',
        }}
      >
        🗄 Arkistoi asiakas
      </button>

      {auki && (
        <div
          onClick={() => !arkistoidaan && setAuki(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="arkistoi-otsikko"
          style={{
            position:       'fixed',
            inset:          0,
            background:     'rgba(0, 0, 0, 0.6)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '16px',
            zIndex:         1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background:    'white',
              borderRadius:  '16px',
              padding:       '24px',
              maxWidth:      '440px',
              width:         '100%',
              boxShadow:     '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display:       'flex',
              flexDirection: 'column',
              gap:           '16px',
            }}
          >
            <div>
              <h3 id="arkistoi-otsikko" style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                Arkistoi asiakas?
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                Tiedot säilyvät tallessa, mutta asiakas piiloutuu rekisteristä.
                Voit palauttaa hänet myöhemmin Arkisto-näkymästä.
              </p>
            </div>

            {virhe && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#991b1b' }}>
                Arkistointi epäonnistui: {virhe}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setAuki(false)}
                disabled={arkistoidaan}
                style={{
                  padding:      '10px 18px',
                  borderRadius: '10px',
                  border:       '1px solid #e5e7eb',
                  background:   'transparent',
                  color:        '#374151',
                  fontSize:     '14px',
                  fontWeight:   500,
                  cursor:       arkistoidaan ? 'not-allowed' : 'pointer',
                  opacity:      arkistoidaan ? 0.5 : 1,
                }}
              >
                Peru
              </button>
              <button
                type="button"
                onClick={vahvista}
                disabled={arkistoidaan}
                autoFocus
                style={{
                  padding:      '10px 18px',
                  borderRadius: '10px',
                  border:       'none',
                  background:   '#6b7280',
                  color:        'white',
                  fontSize:     '14px',
                  fontWeight:   600,
                  cursor:       arkistoidaan ? 'wait' : 'pointer',
                  opacity:      arkistoidaan ? 0.7 : 1,
                }}
              >
                {arkistoidaan ? 'Arkistoidaan…' : 'Arkistoi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
