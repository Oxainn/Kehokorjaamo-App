import { useState } from 'react'
import { anatomia } from '../data/anatomy-fi'

const OSIOT = [
  { avain: 'sijainti',        otsikko: 'Sijainti' },
  { avain: 'tehtava',         otsikko: 'Tehtävä' },
  { avain: 'yhteys_lantioon', otsikko: 'Yhteys lantioon' },
  { avain: 'tuntomerkit',     otsikko: 'Näin tunnistat' },
  { avain: 'kasittelykohta',  otsikko: 'Käsittelykohta' },
]

function onSuositeltu(lihas, highlights) {
  if (!highlights.length) return false
  const nimi = lihas.nimi.toLowerCase()
  return highlights.some((h) => {
    const hLower = h.toLowerCase()
    return hLower.includes(nimi) || nimi.includes(hLower.split(/[\s(]/)[0])
  })
}

function Lihaskortti({ lihas, auki, onToggle, suositeltu }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 transition-colors ${
      suositeltu ? 'border-brand-400' : 'border-transparent shadow-sm ring-1 ring-gray-100'
    }`}>
      {/* Otsikkorivi */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h3 className="font-semibold text-gray-800 text-base leading-snug">{lihas.nimi}</h3>
          {suositeltu && (
            <span className="flex-shrink-0 text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              Suositeltu hoitoon
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 italic">{lihas.anatominen}</p>
      </div>

      {/* Laajeneva sisältö — grid-rows-trick sujuvaa animaatiota varten */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          auki ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 px-5 pb-5">
            {OSIOT.map(({ avain, otsikko }) =>
              lihas[avain] ? (
                <div key={avain}>
                  <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">
                    {otsikko}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{lihas[avain]}</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      </div>

      {/* Nappi */}
      <div className="px-5 pb-5">
        <button
          onClick={onToggle}
          className="text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors"
        >
          {auki ? 'Sulje ↑' : 'Näytä lisää →'}
        </button>
      </div>
    </div>
  )
}

export default function MuscleLibrary({ highlights = [] }) {
  const [haku, setHaku]       = useState('')
  const [avoinna, setAvoinna] = useState(null)

  const suodatettu = anatomia
    .filter((l) => {
      const q = haku.toLowerCase()
      return l.nimi.toLowerCase().includes(q) || l.anatominen.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const aS = onSuositeltu(a, highlights) ? 1 : 0
      const bS = onSuositeltu(b, highlights) ? 1 : 0
      return bS - aS
    })

  const toggle = (id) => setAvoinna((prev) => (prev === id ? null : id))

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Lihaskirjasto</h2>
        <p className="mt-1 text-gray-500 text-sm">
          Tietopankki lihaksista, niiden toiminnasta ja hoitomenetelmistä.
        </p>
      </div>

      <input
        type="search"
        value={haku}
        onChange={(e) => { setHaku(e.target.value); setAvoinna(null) }}
        placeholder="Hae lihasta nimellä..."
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />

      {suodatettu.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">
            Ei tuloksia hakusanalla <strong>{haku}</strong>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suodatettu.map((lihas) => (
            <Lihaskortti
              key={lihas.id}
              lihas={lihas}
              auki={avoinna === lihas.id}
              onToggle={() => toggle(lihas.id)}
              suositeltu={onSuositeltu(lihas, highlights)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
