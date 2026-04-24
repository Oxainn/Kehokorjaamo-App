import { useState } from 'react'
import { KIRJAUSRAKENNE } from '../data/findings-structure.js'

const RYHMÄT = [
  {
    tyyppi: 'primaari',
    otsikko: 'Primaari',
    reunus: 'border-green-400',
    pilli: 'bg-green-100 text-green-800',
    bg: 'bg-green-50',
  },
  {
    tyyppi: 'lantio-seuraus',
    otsikko: 'Lantion seuraukset',
    reunus: 'border-orange-400',
    pilli: 'bg-orange-100 text-orange-800',
    bg: 'bg-orange-50',
  },
  {
    tyyppi: 'selkaranka-seuraus',
    otsikko: 'Selkärangan seuraukset',
    reunus: 'border-blue-400',
    pilli: 'bg-blue-100 text-blue-800',
    bg: 'bg-blue-50',
  },
]

const LEGENDA = [
  { color: '#e5e7eb', label: 'Ei merkitty' },
  { color: '#bfdbfe', label: 'Kipu 0' },
  { color: '#86efac', label: '1–3' },
  { color: '#fdba74', label: '4–6' },
  { color: '#fca5a5', label: '7–10' },
]

function kipuVäri(kipu) {
  if (kipu === 0) return '#bfdbfe'
  if (kipu <= 3)  return '#86efac'
  if (kipu <= 6)  return '#fdba74'
  return '#fca5a5'
}

function ryhmäInfo(tyyppi) {
  return RYHMÄT.find(r => r.tyyppi === tyyppi) ?? RYHMÄT[0]
}

function tyhjäLöydös(alue) {
  const kirjaukset = {}
  alue.kirjaukset.forEach(k => { kirjaukset[k.id] = null })
  return { tyyppi: alue.tyyppi, kipu: 0, kirjaukset }
}

function KirjausKenttä({ kirjaus, arvo, onChange }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {kirjaus.nimi}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onChange(kirjaus.id, null)}
          className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors
            ${arvo === null
              ? 'bg-gray-400 text-white border-gray-400'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
        >
          Ei
        </button>
        {kirjaus.vaihtoehdot.map(v => (
          <button
            key={v}
            onClick={() => onChange(kirjaus.id, v)}
            className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors
              ${arvo === v
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-600 hover:text-brand-700'
              }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function BodyMap({ onAnalyze }) {
  const [löydökset, setLöydökset] = useState({})
  const [valittu, setValittu]     = useState(null)

  const klikkaaAlue = (id) => {
    setValittu(id)
    if (!löydökset[id]) {
      const alue = KIRJAUSRAKENNE.find(a => a.id === id)
      setLöydökset(prev => ({ ...prev, [id]: tyhjäLöydös(alue) }))
    }
  }

  const päivitäKirjaus = (kirjausId, arvo) => {
    if (!valittu) return
    setLöydökset(prev => ({
      ...prev,
      [valittu]: {
        ...prev[valittu],
        kirjaukset: { ...prev[valittu].kirjaukset, [kirjausId]: arvo },
      },
    }))
  }

  const päivitäKipu = (arvo) => {
    if (!valittu) return
    setLöydökset(prev => ({
      ...prev,
      [valittu]: { ...prev[valittu], kipu: arvo },
    }))
  }

  const poista = (id) => {
    setLöydökset(prev => {
      const { [id]: _, ...rest } = prev
      return rest
    })
    if (valittu === id) setValittu(null)
  }

  const analysoi = () => {
    const findings = Object.entries(löydökset).map(([id, data]) => ({
      alue: KIRJAUSRAKENNE.find(a => a.id === id)?.nimi ?? id,
      tyyppi: data.tyyppi,
      kipu: data.kipu,
      kirjaukset: data.kirjaukset,
    }))
    onAnalyze?.(findings)
  }

  const valittuMääritys = KIRJAUSRAKENNE.find(a => a.id === valittu)
  const valittuData     = valittu ? löydökset[valittu] : null
  const löydösMäärä     = Object.keys(löydökset).length

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Kehokartta</h2>
        <p className="mt-1 text-gray-500 text-sm">
          Valitse kehon alue kirjataksesi löydöksen.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Vasen: kehokaavio */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0 w-full lg:w-auto">
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
            <img
              src="/hahmokuvat.svg"
              alt="Kehokaavio"
              style={{ width: '100%', display: 'block' }}
            />
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              viewBox="0 0 1471 1069"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Testipisteet — edestä-näkymä (x 740–1100) */}
              {[
                { id: 'paa',    cx: 920, cy: 80  },
                { id: 'hartiat', cx: 920, cy: 230 },
                { id: 'lantio', cx: 920, cy: 480 },
                { id: 'polvi_v', cx: 890, cy: 700 },
                { id: 'nilkka_v', cx: 885, cy: 930 },
              ].map(({ id, cx, cy }) => {
                const onValittu = valittu === id
                return (
                  <g key={id} onClick={() => klikkaaAlue(id)} style={{ cursor: 'pointer' }}>
                    <circle cx={cx} cy={cy} r={30} fill="transparent" />
                    <circle
                      cx={cx} cy={cy} r={10}
                      fill={onValittu ? '#1D9E75' : '#CBD5E1'}
                      stroke="white" strokeWidth={2}
                    />
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs text-gray-500">
            {LEGENDA.map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-full inline-block border border-gray-300"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Oikea paneeli */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Alueet ryhmittäin */}
          {RYHMÄT.map(ryhmä => {
            const alueet = KIRJAUSRAKENNE.filter(a => a.tyyppi === ryhmä.tyyppi)
            return (
              <div
                key={ryhmä.tyyppi}
                className={`rounded-xl border-2 ${ryhmä.reunus} ${ryhmä.bg} p-4`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  {ryhmä.otsikko}
                </p>
                <div className="flex flex-wrap gap-2">
                  {alueet.map(alue => {
                    const löydös   = löydökset[alue.id]
                    const isActive = alue.id === valittu
                    return (
                      <button
                        key={alue.id}
                        onClick={() => klikkaaAlue(alue.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all
                          ${isActive
                            ? 'bg-gray-800 text-white border-gray-800'
                            : löydös
                              ? 'bg-white border-gray-300 text-gray-700'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                          }`}
                        style={löydös && !isActive
                          ? { borderColor: kipuVäri(löydös.kipu) }
                          : {}
                        }
                      >
                        {alue.nimi}
                        {löydös && (
                          <span className="ml-1.5 text-xs opacity-70">
                            VAS {löydös.kipu}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Valitun alueen muokkain */}
          {valittu && valittuData && valittuMääritys ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="font-semibold text-gray-800">{valittuMääritys.nimi}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Mittaa: {valittuMääritys.mittaus}
                  </p>
                </div>
                <button
                  onClick={() => poista(valittu)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors ml-4 flex-shrink-0"
                >
                  Poista löydös
                </button>
              </div>

              <div className="mt-4">
                {valittuMääritys.kirjaukset.map(kirjaus => (
                  <KirjausKenttä
                    key={kirjaus.id}
                    kirjaus={kirjaus}
                    arvo={valittuData.kirjaukset[kirjaus.id]}
                    onChange={päivitäKirjaus}
                  />
                ))}
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Kipu (VAS)
                  <span className="ml-2 normal-case text-gray-800 font-semibold text-sm">
                    {valittuData.kipu} / 10
                  </span>
                </p>
                <div className="flex gap-1">
                  {Array.from({ length: 11 }, (_, i) => {
                    const active = valittuData.kipu === i
                    const cls = active
                      ? i === 0 ? 'bg-blue-400 text-white border-blue-400'
                      : i <= 3  ? 'bg-green-500 text-white border-green-500'
                      : i <= 6  ? 'bg-orange-400 text-white border-orange-400'
                      : 'bg-red-500 text-white border-red-500'
                      : 'bg-gray-100 border-gray-100 text-gray-500 hover:bg-gray-200'
                    return (
                      <button
                        key={i}
                        onClick={() => päivitäKipu(i)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-colors ${cls}`}
                      >
                        {i}
                      </button>
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Ei kipua</span>
                  <span>Pahin mahdollinen</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400">
                Valitse alue yllä kirjataksesi löydöksen.
              </p>
            </div>
          )}

          {/* Löydöslista + Analysoi */}
          {löydösMäärä > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                Löydökset
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-normal">
                  {löydösMäärä}
                </span>
              </h3>

              <ul className="divide-y divide-gray-50 -mx-2 mb-4">
                {KIRJAUSRAKENNE
                  .filter(a => löydökset[a.id])
                  .map(alue => {
                    const data     = löydökset[alue.id]
                    const isActive = alue.id === valittu
                    const rInfo    = ryhmäInfo(alue.tyyppi)
                    const kirjatut = Object.entries(data.kirjaukset)
                      .filter(([, v]) => v !== null)
                    return (
                      <li
                        key={alue.id}
                        onClick={() => setValittu(alue.id)}
                        className={`flex items-center justify-between px-2 py-2.5 rounded-lg cursor-pointer transition-colors
                          ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${rInfo.pilli}`}>
                            {rInfo.otsikko.split(' ')[0]}
                          </span>
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {alue.nimi}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs ml-2 flex-shrink-0">
                          {kirjatut.map(([kid, v]) => (
                            <span key={kid} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {v}
                            </span>
                          ))}
                          <span className={`font-bold px-1.5 py-0.5 rounded
                            ${data.kipu === 0   ? 'text-blue-600 bg-blue-50'
                            : data.kipu <= 3 ? 'text-green-700 bg-green-50'
                            : data.kipu <= 6 ? 'text-orange-700 bg-orange-50'
                            : 'text-red-700 bg-red-50'}`}
                          >
                            VAS {data.kipu}
                          </span>
                        </div>
                      </li>
                    )
                  })}
              </ul>

              <button
                onClick={analysoi}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-900 text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                Analysoi löydökset →
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
