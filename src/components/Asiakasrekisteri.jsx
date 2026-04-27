import { useState } from 'react'

export default function Asiakasrekisteri({ asiakkaat = [], onAvaaAsiakas }) {
  const [haku, setHaku] = useState('')

  const suodatettu = asiakkaat.filter(a => {
    if (!haku.trim()) return true
    const q = haku.toLowerCase()
    return (
      a.nimi?.toLowerCase().includes(q) ||
      a.sahkoposti?.toLowerCase().includes(q)
    )
  })

  const viimeisimmät = [...asiakkaat]
    .sort((a, b) => new Date(b.luotu) - new Date(a.luotu))
    .slice(0, 5)

  const avatarKirjain = (nimi) =>
    nimi?.trim()?.[0]?.toUpperCase() ?? '?'

  const muotoilePvm = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('fi-FI')
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Asiakasrekisteri</h2>
        <p className="mt-1 text-gray-500 text-sm">
          {asiakkaat.length} asiakasta rekisterissä
        </p>
      </div>

      {/* Hakukenttä */}
      <input
        type="text"
        placeholder="Hae nimellä tai sähköpostilla..."
        value={haku}
        onChange={e => setHaku(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
      />

      {/* Viimeisimmät asiakkaat */}
      {!haku.trim() && viimeisimmät.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 text-base mb-3">Viimeisimmät asiakkaat</h3>
          <div className="flex flex-col gap-2">
            {viimeisimmät.map(a => (
              <div
                key={a.id}
                onClick={() => onAvaaAsiakas?.(a)}
                style={{ cursor: 'pointer' }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: '#E1F5EE', color: '#085041',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '600', fontSize: '15px', flexShrink: 0,
                }}>
                  {avatarKirjain(a.nimi)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.nimi}</p>
                  {a.sahkoposti && (
                    <p className="text-xs text-gray-400 truncate">{a.sahkoposti}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {muotoilePvm(a.luotu)}
                </span>
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

        {suodatettu.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {haku.trim() ? 'Ei hakutuloksia' : 'Ei asiakkaita vielä'}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {suodatettu.map(a => (
              <div
                key={a.id}
                onClick={() => onAvaaAsiakas?.(a)}
                style={{ cursor: 'pointer' }}
                className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: '#F0F4FF', color: '#3B4FCC',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '600', fontSize: '15px', flexShrink: 0,
                }}>
                  {avatarKirjain(a.nimi)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.nimi}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {a.sahkoposti || a.puhelin || '—'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{muotoilePvm(a.luotu)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
