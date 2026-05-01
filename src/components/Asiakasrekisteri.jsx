import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

// Asiakasrekisteri jakautuu kahteen osioon:
//   - "Uudet asiakkaat" (vahvistettu = false) — ylhäällä, korostettuna oranssilla
//     reunalla. Tänne tulevat julkisen lomakkeen kautta saapuneet, jotka
//     odottavat hoitajan tarkistusta ja "Tallenna asiakas" -klikkausta.
//   - "Asiakkaat" (vahvistettu = true) — alla, normaali näkymä.
// Hakukenttä suodattaa molempia osioita yhtaikaa.

export default function Asiakasrekisteri({ onValitseAsiakas, hoitajaId }) {
  const [asiakkaat, setAsiakkaat] = useState([])
  const [haku, setHaku]           = useState('')
  const [lataa, setLataa]         = useState(true)

  useEffect(() => {
    const haeAsiakkaat = async () => {
      if (!hoitajaId) {
        setLataa(false)
        return
      }
      // Suora kysely asiakkaat-tauluun (ei `asiakkaan_nykyinen_lomake`-viewistä)
      // jotta saadaan vahvistettu-sarake mukaan.
      const { data, error } = await supabase
        .from('asiakkaat')
        .select('id, nimi, sahkoposti, puhelin, syntymaaika, luotu, vahvistettu')
        .eq('hoitaja_id', hoitajaId)
        .order('luotu', { ascending: false })
      if (!error) setAsiakkaat(data ?? [])
      setLataa(false)
    }
    haeAsiakkaat()
  }, [hoitajaId])

  const haetMatchaa = (a) => (
    a.nimi?.toLowerCase().includes(haku.toLowerCase()) ||
    a.sahkoposti?.toLowerCase().includes(haku.toLowerCase())
  )

  const uudet         = asiakkaat.filter((a) => a.vahvistettu === false && haetMatchaa(a))
  const vahvistetut   = asiakkaat.filter((a) => a.vahvistettu !== false && haetMatchaa(a))

  const muotoilePvm = (iso) =>
    iso ? new Date(iso).toLocaleDateString('fi-FI') : null

  const avatarKirjain = (nimi) =>
    nimi?.trim()?.[0]?.toUpperCase() ?? '?'

  if (lataa) return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280', fontSize: '14px' }}>
      Haetaan asiakkaita...
    </div>
  )

  function AsiakasKortti({ a, korostettu }) {
    return (
      <div
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '12px',
          padding:    '14px 16px',
          borderRadius: '12px',
          background: korostettu ? '#fffbeb' : 'white',
          border:     korostettu ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
        }}
      >
        <div style={{
          width: '42px', height: '42px', borderRadius: '50%',
          background: korostettu ? '#fde68a' : '#E1F5EE',
          color:      korostettu ? '#92400e' : '#085041',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '16px', flexShrink: 0,
        }}>
          {avatarKirjain(a.nimi)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.nimi || '(nimetön)'}
          </p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[a.sahkoposti, a.puhelin].filter(Boolean).join(' · ') || '—'}
          </p>
          {a.luotu && (
            <p style={{ fontSize: '11px', color: korostettu ? '#92400e' : '#9ca3af', margin: '2px 0 0', fontWeight: korostettu ? 500 : 400 }}>
              {korostettu ? `Täyttänyt lomakkeen: ${muotoilePvm(a.luotu)}` : `Lisätty: ${muotoilePvm(a.luotu)}`}
            </p>
          )}
        </div>

        <button
          onClick={() => onValitseAsiakas?.(a)}
          style={{
            padding:      '7px 16px',
            borderRadius: '20px',
            border:       'none',
            background:   korostettu ? '#f59e0b' : '#1D9E75',
            color:        'white',
            fontSize:     '13px',
            fontWeight:   500,
            cursor:       'pointer',
            flexShrink:   0,
          }}
        >
          {korostettu ? 'Tarkista' : 'Avaa'}
        </button>
      </div>
    )
  }

  return (
    <section>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>
        Asiakasrekisteri
        <span style={{ fontSize: '13px', fontWeight: 400, color: '#9ca3af', marginLeft: '8px' }}>
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

      {/* Uudet asiakkaat — vain jos vahvistamattomia on */}
      {uudet.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '8px', paddingLeft: '4px',
          }}>
            <span style={{ fontSize: '14px' }}>🔔</span>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Uudet asiakkaat ({uudet.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {uudet.map(a => <AsiakasKortti key={a.id} a={a} korostettu />)}
          </div>
        </div>
      )}

      {/* Vahvistetut asiakkaat */}
      {vahvistetut.length > 0 && (
        <div>
          {uudet.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingLeft: '4px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Asiakkaat ({vahvistetut.length})
              </h3>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {vahvistetut.map(a => <AsiakasKortti key={a.id} a={a} />)}
          </div>
        </div>
      )}

      {uudet.length === 0 && vahvistetut.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 16px',
          color: '#9ca3af', fontSize: '14px',
          background: 'white', borderRadius: '12px',
          border: '1px solid #f3f4f6',
        }}>
          {haku.trim() ? 'Ei hakutuloksia' : 'Ei asiakkaita vielä'}
        </div>
      )}
    </section>
  )
}
