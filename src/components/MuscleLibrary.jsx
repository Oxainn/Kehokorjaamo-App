import { useState } from 'react'
import { anatomia } from '../data/anatomy-fi'

function Lihaskortti({ lihas }) {
  const [auki, setAuki] = useState(false)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-gray-800 text-base leading-snug">{lihas.nimi}</h3>
        <p className="text-xs text-gray-400 mt-0.5 italic">{lihas.anatominen}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sijainti</p>
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{lihas.sijainti}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tehtävä</p>
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{lihas.tehtava}</p>
      </div>

      {auki && (
        <>
          {lihas.yhteys_lantioon && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Yhteys lantioon</p>
              <p className="text-sm text-gray-700 leading-relaxed">{lihas.yhteys_lantioon}</p>
            </div>
          )}

          {lihas.tuntomerkit && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tuntomerkit</p>
              <p className="text-sm text-gray-700 leading-relaxed">{lihas.tuntomerkit}</p>
            </div>
          )}

          {lihas.kasittelykohta && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Käsittelykohta</p>
              <p className="text-sm text-gray-700 leading-relaxed">{lihas.kasittelykohta}</p>
            </div>
          )}
        </>
      )}

      <button
        onClick={() => setAuki(!auki)}
        className="mt-auto text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors text-left"
      >
        {auki ? '↑ Näytä vähemmän' : 'Näytä lisää →'}
      </button>
    </div>
  )
}

export default function MuscleLibrary() {
  const [haku, setHaku] = useState('')

  const suodatettu = anatomia.filter((l) => {
    const q = haku.toLowerCase()
    return (
      l.nimi.toLowerCase().includes(q) ||
      l.anatominen.toLowerCase().includes(q)
    )
  })

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
        onChange={(e) => setHaku(e.target.value)}
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
            <Lihaskortti key={lihas.id} lihas={lihas} />
          ))}
        </div>
      )}
    </section>
  )
}
