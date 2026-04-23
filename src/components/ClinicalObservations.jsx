import { useState, useEffect } from 'react'

const STORAGE_KEY = 'kehokorjaamo_kliiniset'

const VASEN_SARAKE = [
  'Jalkaterät',
  'Polvet',
  'Alaraajat',
  'Lantion alue',
  'Lannerangan alue',
]

const OIKEA_SARAKE = [
  'Rintarangan alue',
  'Yläraajat',
  'Hartiaseutu',
  'Kaularangan alue',
  'Pää ja leukanivelet',
]

const KAIKKI_ALUEET = [...VASEN_SARAKE, ...OIKEA_SARAKE]

const MUUTOSTYYPIT = ['Kallistus', 'Siirtymä', 'Kierto', 'Taivutus', 'Mittaero']

const TYHJÄ = {
  havainnot: {},
  muutokset: {},
}

function AlueKenttä({ alue, arvo, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {alue}
      </label>
      <textarea
        rows={2}
        value={arvo ?? ''}
        onChange={(e) => onChange(alue, e.target.value)}
        placeholder="Havaintoja..."
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  )
}

function MuutosRivi({ alue, valitut, onToggle }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-2 pr-4 text-sm text-gray-700 font-medium whitespace-nowrap w-40">
        {alue}
      </td>
      {MUUTOSTYYPIT.map((tyyppi) => (
        <td key={tyyppi} className="py-2 text-center">
          <button
            type="button"
            onClick={() => onToggle(alue, tyyppi)}
            className={`w-6 h-6 rounded border-2 text-xs font-bold transition-colors ${
              valitut?.[tyyppi]
                ? 'bg-brand-600 border-brand-600 text-white'
                : 'bg-white border-gray-200 text-gray-300 hover:border-brand-400'
            }`}
          >
            {valitut?.[tyyppi] ? '✓' : ''}
          </button>
        </td>
      ))}
    </tr>
  )
}

export default function ClinicalObservations({ asiakasData, onComplete }) {
  const [data, setData] = useState(() => {
    try {
      const tallennettu = localStorage.getItem(STORAGE_KEY)
      return tallennettu ? JSON.parse(tallennettu) : TYHJÄ
    } catch {
      return TYHJÄ
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const päivitäHavainto = (alue, arvo) => {
    setData((prev) => ({
      ...prev,
      havainnot: { ...prev.havainnot, [alue]: arvo },
    }))
  }

  const toggleMuutos = (alue, tyyppi) => {
    setData((prev) => ({
      ...prev,
      muutokset: {
        ...prev.muutokset,
        [alue]: {
          ...prev.muutokset[alue],
          [tyyppi]: !prev.muutokset[alue]?.[tyyppi],
        },
      },
    }))
  }

  const lähetä = (e) => {
    e.preventDefault()
    if (typeof onComplete === 'function') {
      onComplete(data)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Kliiniset havainnot</h2>
        <p className="mt-1 text-gray-500 text-sm">
          Hoitajan täyttämä osio — ensimmäisen hoitokerran rakenteelliset havainnot.
        </p>
        {asiakasData?.nimi && (
          <p className="mt-2 text-sm font-medium text-brand-700">
            Asiakas: {asiakasData.nimi}
          </p>
        )}
      </div>

      <form onSubmit={lähetä} className="flex flex-col gap-5">

        {/* ── Osio 1: Rakenteelliset havainnot ────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 text-base mb-4">
            Rakenteelliset havainnot
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex flex-col gap-4">
              {VASEN_SARAKE.map((alue) => (
                <AlueKenttä
                  key={alue}
                  alue={alue}
                  arvo={data.havainnot[alue]}
                  onChange={päivitäHavainto}
                />
              ))}
            </div>
            <div className="flex flex-col gap-4">
              {OIKEA_SARAKE.map((alue) => (
                <AlueKenttä
                  key={alue}
                  alue={alue}
                  arvo={data.havainnot[alue]}
                  onChange={päivitäHavainto}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Osio 2: Muutostyypit ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 text-base mb-4">
            Muutostyypit kehon alueittain
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wide w-40">
                    Alue
                  </th>
                  {MUUTOSTYYPIT.map((t) => (
                    <th key={t} className="py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KAIKKI_ALUEET.map((alue) => (
                  <MuutosRivi
                    key={alue}
                    alue={alue}
                    valitut={data.muutokset[alue]}
                    onToggle={toggleMuutos}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          Tallenna havainnot →
        </button>
      </form>
    </section>
  )
}
