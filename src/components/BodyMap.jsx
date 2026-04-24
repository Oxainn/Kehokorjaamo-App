import { useState } from 'react'

const ALUEET = [
  { id: 'paa',      label: 'Pää',               shape: 'ellipse', props: { cx: 100, cy: 32, rx: 24, ry: 28 } },
  { id: 'kaula',    label: 'Kaula',              shape: 'rect',    props: { x: 91, y: 59, width: 18, height: 21, rx: 3 } },
  { id: 'hartiat',  label: 'Hartiat / yläselkä', shape: 'path',    props: { d: 'M52,80 L148,80 L144,152 L56,152 Z' } },
  { id: 'keskilka', label: 'Keskilkä',           shape: 'rect',    props: { x: 62, y: 152, width: 76, height: 50, rx: 2 } },
  { id: 'lantio',   label: 'Lantio / alaselkä',  shape: 'rect',    props: { x: 62, y: 202, width: 76, height: 50, rx: 2 } },
  { id: 'lonkka_v', label: 'Lonkka V',           shape: 'path',    props: { d: 'M58,252 L100,252 L100,292 L54,292 Z' } },
  { id: 'lonkka_o', label: 'Lonkka O',           shape: 'path',    props: { d: 'M100,252 L142,252 L146,292 L100,292 Z' } },
  { id: 'reisi_v',  label: 'Reisi V',            shape: 'rect',    props: { x: 52, y: 292, width: 44, height: 76, rx: 2 } },
  { id: 'reisi_o',  label: 'Reisi O',            shape: 'rect',    props: { x: 104, y: 292, width: 44, height: 76, rx: 2 } },
  { id: 'polvi_v',  label: 'Polvi V',            shape: 'rect',    props: { x: 54, y: 368, width: 40, height: 28, rx: 2 } },
  { id: 'polvi_o',  label: 'Polvi O',            shape: 'rect',    props: { x: 106, y: 368, width: 40, height: 28, rx: 2 } },
  { id: 'saari_v',  label: 'Sääri V',            shape: 'rect',    props: { x: 56, y: 396, width: 36, height: 64, rx: 2 } },
  { id: 'saari_o',  label: 'Sääri O',            shape: 'rect',    props: { x: 108, y: 396, width: 36, height: 64, rx: 2 } },
  { id: 'jalka_v',  label: 'Jalka V',            shape: 'rect',    props: { x: 44, y: 460, width: 50, height: 24, rx: 3 } },
  { id: 'jalka_o',  label: 'Jalka O',            shape: 'rect',    props: { x: 106, y: 460, width: 50, height: 24, rx: 3 } },
]

const TYHJÄ = { kallistus: null, kierto: null, kipu: 0 }

const KALLISTUS_OPT = [
  { arvo: 'vasen', teksti: '← Vasen' },
  { arvo: null,    teksti: 'Ei' },
  { arvo: 'oikea', teksti: 'Oikea →' },
]

const KIERTO_OPT = [
  { arvo: 'eteen',  teksti: '↺ Eteen' },
  { arvo: null,     teksti: 'Ei' },
  { arvo: 'taakse', teksti: 'Taakse ↻' },
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

function SvgAlue({ alue, löydös, isSelected, onClick }) {
  const fill        = löydös ? kipuVäri(löydös.kipu) : '#e5e7eb'
  const stroke      = isSelected ? '#1d4ed8' : '#9ca3af'
  const strokeWidth = isSelected ? 2.5 : 1

  const common = {
    fill, stroke, strokeWidth, onClick,
    style: { cursor: 'pointer' },
    className: 'transition-all duration-150 hover:opacity-75',
  }

  if (alue.shape === 'ellipse') return <ellipse {...common} {...alue.props} />
  if (alue.shape === 'rect')    return <rect    {...common} {...alue.props} />
  if (alue.shape === 'path')    return <path    {...common} {...alue.props} />
  return null
}

function ToggleGroup({ label, options, value, onChange }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex gap-2">
        {options.map(({ arvo, teksti }) => (
          <button
            key={String(arvo)}
            onClick={() => onChange(arvo)}
            className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors
              ${value === arvo
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-600 hover:text-brand-700'
              }`}
          >
            {teksti}
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
    setLöydökset(prev => prev[id] ? prev : { ...prev, [id]: { ...TYHJÄ } })
  }

  const päivitä = (kenttä, arvo) => {
    if (!valittu) return
    setLöydökset(prev => ({
      ...prev,
      [valittu]: { ...prev[valittu], [kenttä]: arvo },
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
      alue: ALUEET.find(a => a.id === id)?.label ?? id,
      ...data,
    }))
    onAnalyze?.(findings)
  }

  const valittuAlue = ALUEET.find(a => a.id === valittu)
  const valittuData = valittu ? löydökset[valittu] : null
  const löydösMäärä = Object.keys(löydökset).length

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Kehokartta</h2>
        <p className="mt-1 text-gray-500 text-sm">
          Klikkaa kehon aluetta lisätäksesi löydöksen.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Kehokaavio: pohjakuva + SVG-overlay */}
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
              {/* Testipisteet — tarkista koordinaatit oikeaan hahmokuvaan */}
              <circle cx={730} cy={80}  r={20} fill="red" opacity={0.5} />
              <circle cx={730} cy={220} r={20} fill="red" opacity={0.5} />
              <circle cx={730} cy={480} r={20} fill="red" opacity={0.5} />
              <circle cx={700} cy={720} r={20} fill="red" opacity={0.5} />
              <circle cx={700} cy={950} r={20} fill="red" opacity={0.5} />
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
          {/* Aluekohtainen muokkain */}
          {valittu && valittuData ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-800">{valittuAlue?.label}</h3>
                <button
                  onClick={() => poista(valittu)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Poista löydös
                </button>
              </div>

              <ToggleGroup
                label="Kallistus"
                options={KALLISTUS_OPT}
                value={valittuData.kallistus}
                onChange={(arvo) => päivitä('kallistus', arvo)}
              />

              <ToggleGroup
                label="Kierto"
                options={KIERTO_OPT}
                value={valittuData.kierto}
                onChange={(arvo) => päivitä('kierto', arvo)}
              />

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
                        onClick={() => päivitä('kipu', i)}
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
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-400">
                Klikkaa kehon aluetta lisätäksesi löydöksen.
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
                {Object.entries(löydökset).map(([id, data]) => {
                  const alue    = ALUEET.find(a => a.id === id)
                  const isActive = id === valittu
                  return (
                    <li
                      key={id}
                      onClick={() => setValittu(id)}
                      className={`flex items-center justify-between px-2 py-2.5 rounded-lg cursor-pointer transition-colors
                        ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <span className="text-sm font-medium text-gray-700">{alue?.label}</span>
                      <div className="flex items-center gap-1.5 text-xs">
                        {data.kallistus && (
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {data.kallistus === 'vasen' ? '←' : '→'} {data.kallistus}
                          </span>
                        )}
                        {data.kierto && (
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {data.kierto === 'eteen' ? '↺' : '↻'} {data.kierto}
                          </span>
                        )}
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
