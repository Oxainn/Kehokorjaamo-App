import { useState, useEffect } from 'react'
import { haeAsiakkaatKaynneilla, haeKaynit, poistaAsiakas } from '../lib/db'

export default function Asiakasrekisteri({ onAvaaAsiakas, onAvaaKaynti, onUusiKaynti }) {
  const [asiakkaat, setAsiakkaat]       = useState([])
  const [lataa, setLataa]               = useState(true)
  const [haku, setHaku]                 = useState('')
  const [avattuAsiakas, setAvattuAsiakas] = useState(null)
  const [kaynit, setKaynit]             = useState({})

  useEffect(() => {
    haeAsiakkaatKaynneilla().then(data => {
      setAsiakkaat(data)
      setLataa(false)
    })
  }, [])

  const avaaAsiakas = (a) => {
    if (avattuAsiakas?.id === a.id) {
      setAvattuAsiakas(null)
      return
    }
    setAvattuAsiakas(a)
    if (!kaynit[a.id]) {
      haeKaynit(a.id).then(data =>
        setKaynit(prev => ({ ...prev, [a.id]: data }))
      )
    }
  }

  const suodatettu = asiakkaat.filter(a =>
    a.nimi?.toLowerCase().includes(haku.toLowerCase()) ||
    a.sahkoposti?.toLowerCase().includes(haku.toLowerCase())
  )

  const viimeisimmät = [...asiakkaat]
    .sort((a, b) => new Date(b.luotu) - new Date(a.luotu))
    .slice(0, 5)

  const avatarKirjain = (nimi) => nimi?.trim()?.[0]?.toUpperCase() ?? '?'
  const muotoilePvm   = (iso)  => iso ? new Date(iso).toLocaleDateString('fi-FI') : null

  const AvatarVihreä = ({ nimi }) => (
    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#E1F5EE', color: '#085041', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '15px' }}>
      {avatarKirjain(nimi)}
    </div>
  )

  const AvatarSininen = ({ nimi }) => (
    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#F0F4FF', color: '#3B4FCC', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '15px' }}>
      {avatarKirjain(nimi)}
    </div>
  )

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Asiakasrekisteri</h2>
        <p className="mt-1 text-gray-500 text-sm">
          {lataa ? 'Ladataan...' : `${asiakkaat.length} asiakasta rekisterissä`}
        </p>
      </div>

      <input
        type="text"
        placeholder="Hae nimellä tai sähköpostilla..."
        value={haku}
        onChange={e => setHaku(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
      />

      {/* Viimeisimmät asiakkaat */}
      {!haku.trim() && !lataa && viimeisimmät.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 text-base mb-3">Viimeisimmät asiakkaat</h3>
          <div className="flex flex-col gap-2">
            {viimeisimmät.map(a => (
              <div
                key={a.id}
                onClick={() => onAvaaAsiakas?.(a)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer"
              >
                <AvatarVihreä nimi={a.nimi} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.nimi}</p>
                  {a.sahkoposti && (
                    <p className="text-xs text-gray-400 truncate">{a.sahkoposti}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{muotoilePvm(a.luotu)}</p>
                  <p className="text-xs text-gray-300">{a.kaynteja} käyntiä</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kaikki asiakkaat */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 text-base mb-3">
          {haku.trim() ? `Hakutulokset (${suodatettu.length})` : 'Kaikki asiakkaat'}
        </h3>

        {lataa ? (
          <p className="text-sm text-gray-400 text-center py-6">Ladataan...</p>
        ) : suodatettu.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {haku.trim() ? 'Ei hakutuloksia' : 'Ei asiakkaita vielä'}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {suodatettu.map(a => {
              const auki = avattuAsiakas?.id === a.id
              const asiakkaanKaynit = kaynit[a.id] ?? null
              return (
                <div key={a.id}>
                  {/* Otsikkorivi */}
                  <div
                    onClick={() => avaaAsiakas(a)}
                    className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <AvatarSininen nimi={a.nimi} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.nimi}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {a.sahkoposti || a.puhelin || '—'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-2">
                      <p className="text-xs text-gray-500">{a.kaynteja} käyntiä</p>
                      <p className="text-xs text-gray-400">
                        {a.viimeisinKaynti
                          ? new Date(a.viimeisinKaynti).toLocaleDateString('fi-FI')
                          : 'Ei käyntejä'}
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>
                      {auki ? '▲' : '▼'}
                    </span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (window.confirm(`Poistetaanko ${a.nimi} asiakasrekisteristä?\nTämä poistaa myös kaikki hoitokäynnit!`)) {
                          await poistaAsiakas(a.id)
                          setAsiakkaat(prev => prev.filter(x => x.id !== a.id))
                          if (avattuAsiakas?.id === a.id) setAvattuAsiakas(null)
                        }
                      }}
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: '1px solid #F09595', background: 'transparent', color: '#A32D2D', cursor: 'pointer', flexShrink: 0 }}
                    >
                      Poista
                    </button>
                  </div>

                  {/* Laajennettu näkymä */}
                  {auki && (
                    <div style={{ padding: '12px 8px 16px', borderTop: '1px solid #f3f4f6' }}>
                      {/* Perustiedot */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                        {a.puhelin && (
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                            <span style={{ color: '#9ca3af' }}>Puh: </span>{a.puhelin}
                          </p>
                        )}
                        {a.sahkoposti && (
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                            <span style={{ color: '#9ca3af' }}>Email: </span>{a.sahkoposti}
                          </p>
                        )}
                      </div>

                      {/* Hoitokerrat */}
                      <p style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.04em' }}>
                        Hoitokerrat
                      </p>
                      {asiakkaanKaynit === null ? (
                        <p style={{ fontSize: '12px', color: '#9ca3af' }}>Ladataan...</p>
                      ) : asiakkaanKaynit.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Ei hoitokertoja</p>
                      ) : (
                        asiakkaanKaynit.map(k => (
                          <div
                            key={k.id}
                            onClick={() => onAvaaKaynti?.(a, k)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}
                          >
                            <span style={{ fontSize: '13px', color: '#374151' }}>
                              {new Date(k.pvm).toLocaleDateString('fi-FI')}
                            </span>
                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>Avaa →</span>
                          </div>
                        ))
                      )}

                      <button
                        onClick={() => onUusiKaynti?.(a)}
                        style={{ width: '100%', padding: '8px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', marginTop: '8px', fontWeight: '500' }}
                      >
                        + Uusi hoitokerta
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
