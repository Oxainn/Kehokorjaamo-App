// Käyntihistoria-osio asiakkaan kortin alaosaan.
// Näyttää listan asiakkaan suljetuista lomakeversioista (mennyt hoitokäynti =
// yksi suljettu versio). Tyhjä lista → komponentti ei renderöi mitään, joten
// uudet asiakkaat eivät näe tarpeetonta osiota.
//
// Klikkaus [Avaa] avaa KayntiNakyma-modaalin jossa kyseinen versio näkyy
// read-only — hoitaja näkee miten asiakas oli silloin.

import { useState, useEffect } from 'react'
import { haeKayntienPaivamaarat } from '../lib/db'
import { muotoilePvm } from '../lib/muotoilu'
import KayntiNakyma from './KayntiNakyma'

const containerTyyli = {
  marginTop:    '24px',
  background:   'white',
  border:       '1px solid #e5e7eb',
  borderRadius: '12px',
  padding:      '16px 20px',
  display:      'flex',
  flexDirection: 'column',
  gap:          '8px',
}

const otsikkoTyyli = {
  fontSize:    '14px',
  fontWeight:  700,
  color:       '#374151',
  margin:      '0 0 4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const riviTyyli = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  padding:        '10px 12px',
  background:     '#f9fafb',
  border:         '1px solid #f3f4f6',
  borderRadius:   '8px',
  fontSize:       '14px',
  color:          '#111827',
}

const avaaNappiTyyli = {
  padding:      '6px 14px',
  borderRadius: '16px',
  border:       '1px solid #1D9E75',
  background:   'white',
  color:        '#085041',
  fontSize:     '12px',
  fontWeight:   600,
  cursor:       'pointer',
}

export default function Kayntihistoria({ asiakas }) {
  const asiakasId = asiakas?.id ?? asiakas?.supabase_id ?? null
  const [kaynnit, setKaynnit] = useState([])
  const [lataa,   setLataa]   = useState(true)
  const [avoinId, setAvoinId] = useState(null)

  useEffect(() => {
    if (!asiakasId) { setLataa(false); return }
    let peruttu = false
    haeKayntienPaivamaarat(asiakasId)
      .then((tulos) => {
        if (peruttu) return
        setKaynnit(tulos)
        setLataa(false)
      })
    return () => { peruttu = true }
  }, [asiakasId])

  // Lataus-tila piilossa — ei välkytetä mitään ennen tuloksia
  if (lataa) return null

  // Tyhjä lista → ei renderöidä mitään (uudet asiakkaat)
  if (kaynnit.length === 0) return null

  return (
    <>
      <div style={containerTyyli}>
        <h3 style={otsikkoTyyli}>Käynnit ({kaynnit.length})</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {kaynnit.map((k) => {
            const pvm = muotoilePvm(k.voimassa_alkaen, '—')
            const teksti = k.otsikko ? `${pvm} · ${k.otsikko}` : pvm
            return (
              <li key={k.id}>
                <div style={riviTyyli}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={teksti}>
                    {teksti}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAvoinId(k.id)}
                    style={avaaNappiTyyli}
                  >
                    Avaa
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {avoinId && (
        <KayntiNakyma
          lomakeVersioId={avoinId}
          asiakas={asiakas}
          onSulje={() => setAvoinId(null)}
        />
      )}
    </>
  )
}
