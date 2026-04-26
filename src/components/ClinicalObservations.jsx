import { useState, useEffect } from 'react'

const STORAGE_KEY   = 'kehokorjaamo_kliiniset'
const LISATYT_KEY   = 'kehokorjaamo_lisatyt_kentat'
const RAPORTIT_KEY  = (asiakasId) => `kehokorjaamo_raportit_${asiakasId}`

const VASEN_SARAKE = [
  { key: 'jalkaterät',  label: 'Jalkaterät' },
  { key: 'nilkat',      label: 'Nilkat' },
  { key: 'polvet',      label: 'Polvet' },
  { key: 'lantio',      label: 'Lantio (kallistus + kierto)' },
  { key: 'lanneranka',  label: 'Lanneranka / alaselkä' },
]

const OIKEA_SARAKE = [
  { key: 'rintaranka',  label: 'Rintaranka' },
  { key: 'hartiat',     label: 'Hartiat' },
  { key: 'kaularanka',  label: 'Kaularanka' },
  { key: 'paa_korvat',  label: 'Pää / korvat' },
  { key: 'selkaranka',  label: 'Selkäranka (skolioosi)' },
]

const KAIKKI_ALUEET = [...VASEN_SARAKE, ...OIKEA_SARAKE].map(f => f.label)

const MUUTOSTYYPIT = ['Kallistus', 'Siirtymä', 'Kierto', 'Taivutus', 'Mittaero']

const TYHJÄ = {
  havainnot: {},
  muutokset: {},
}

const TYHJÄ_RAPORTTI = () => ({
  paivays: new Date().toISOString().slice(0, 10),
  kesto: '',
  lahtotilanne: '',
  kulku: '',
  muistio: '',
})

function AlueKenttä({ avain, label, arvo, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <textarea
        rows={2}
        value={arvo ?? ''}
        onChange={(e) => onChange(avain, e.target.value)}
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

function RaporttiKortti({ raportti }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-800">{raportti.paivays}</span>
        {raportti.kesto && (
          <span className="text-xs text-gray-400">{raportti.kesto} min</span>
        )}
      </div>
      {raportti.lahtotilanne && (
        <p className="text-sm text-gray-600 leading-snug">
          {raportti.lahtotilanne.slice(0, 100)}
          {raportti.lahtotilanne.length > 100 ? '…' : ''}
        </p>
      )}
    </div>
  )
}

function UusiRaporttiLomake({ onTallenna, onPeruuta }) {
  const [raportti, setRaportti] = useState(TYHJÄ_RAPORTTI)

  const päivitä = (kentta, arvo) =>
    setRaportti((prev) => ({ ...prev, [kentta]: arvo }))

  const tallenna = () => {
    if (!raportti.lahtotilanne.trim() && !raportti.kulku.trim()) return
    onTallenna({ ...raportti, id: Date.now() })
  }

  const voidaanTallentaa = raportti.lahtotilanne.trim() || raportti.kulku.trim()

  return (
    <div className="bg-white rounded-xl border border-brand-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Päiväys
          </label>
          <input
            type="date"
            value={raportti.paivays}
            onChange={(e) => päivitä('paivays', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Hoidon kesto (min)
          </label>
          <input
            type="number"
            min={1}
            max={300}
            value={raportti.kesto}
            onChange={(e) => päivitä('kesto', e.target.value)}
            placeholder="60"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Hoidon lähtötilanne
        </label>
        <textarea
          rows={3}
          value={raportti.lahtotilanne}
          onChange={(e) => päivitä('lahtotilanne', e.target.value)}
          placeholder="Asiakkaan vointi hoitokerran alussa..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Hoidon kulku ja lopputulos
        </label>
        <textarea
          rows={3}
          value={raportti.kulku}
          onChange={(e) => päivitä('kulku', e.target.value)}
          placeholder="Mitä tehtiin, miten asiakas reagoi, lopputulos..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Muista ensi kerralla!
        </label>
        <textarea
          rows={2}
          value={raportti.muistio}
          onChange={(e) => päivitä('muistio', e.target.value)}
          placeholder="Huomioita seuraavaa hoitokertaa varten..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={tallenna}
          style={{ opacity: voidaanTallentaa ? 1 : 0.4, pointerEvents: voidaanTallentaa ? 'auto' : 'none' }}
          className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm"
        >
          Tallenna hoitokerta
        </button>
        <button
          type="button"
          onClick={onPeruuta}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-colors text-sm"
        >
          Peruuta
        </button>
      </div>
    </div>
  )
}

export default function ClinicalObservations({ asiakasData, onComplete, onSiirryVälilehdelle }) {
  const [data, setData] = useState(() => {
    try {
      const tallennettu = localStorage.getItem(STORAGE_KEY)
      return tallennettu ? JSON.parse(tallennettu) : TYHJÄ
    } catch {
      return TYHJÄ
    }
  })

  const asiakasId = asiakasData?.nimi
    ? asiakasData.nimi.trim().toLowerCase().replace(/\s+/g, '_')
    : 'tuntematon'

  const [raportit, setRaportit] = useState(() => {
    try {
      const tallennettu = localStorage.getItem(RAPORTIT_KEY(asiakasId))
      return tallennettu ? JSON.parse(tallennettu) : []
    } catch {
      return []
    }
  })

  const [lisaatytKentat, setLisaatytKentat] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LISATYT_KEY) || '[]') }
    catch { return [] }
  })
  const [lisaaKenttaAuki, setLisaaKenttaAuki] = useState(false)
  const [uusiKenttaNimi, setUusiKenttaNimi] = useState('')
  const [lisaaAuki, setLisaaAuki] = useState(false)
  const [kuvausAuki, setKuvausAuki] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    localStorage.setItem(LISATYT_KEY, JSON.stringify(lisaatytKentat))
  }, [lisaatytKentat])

  useEffect(() => {
    localStorage.setItem(RAPORTIT_KEY(asiakasId), JSON.stringify(raportit))
  }, [raportit, asiakasId])

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

  const lisaaKentta = () => {
    const nimi = uusiKenttaNimi.trim()
    if (!nimi) return
    const avain = nimi.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_äöåÄÖÅ]/g, '')
    if (lisaatytKentat.some(k => k.key === avain)) return
    setLisaatytKentat(prev => [...prev, { key: avain, label: nimi }])
    setUusiKenttaNimi('')
    setLisaaKenttaAuki(false)
  }

  const tallennaRaportti = (raportti) => {
    setRaportit((prev) => [raportti, ...prev])
    setLisaaAuki(false)
  }

  const lähetä = (e) => {
    e.preventDefault()
    if (typeof onComplete === 'function') {
      onComplete(data)
    }
  }

  const raportitUusimmastVanhimpaan = [...raportit].sort(
    (a, b) => new Date(b.paivays) - new Date(a.paivays)
  )

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

      <div style={{ textAlign: 'center', margin: '8px 0 16px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onSiirryVälilehdelle?.('kuva')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: '1px solid #1D9E75',
            background: '#E1F5EE',
            color: '#085041',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          📷 Avaa kuva-analyysi
        </button>
        <button
          type="button"
          onClick={() => setKuvausAuki(!kuvausAuki)}
          style={{
            padding: '6px 20px',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            background: kuvausAuki ? '#E1F5EE' : 'transparent',
            color:      kuvausAuki ? '#085041' : '#666',
            fontSize:   '13px',
            cursor:     'pointer',
          }}
        >
          {kuvausAuki ? '▲ Piilota kuvaus' : '▼ Palvelun kuvaus'}
        </button>
      </div>

      {kuvausAuki && (
        <div style={{
          padding: '12px 16px',
          background: '#F8FAFC',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '13px',
          color: '#444',
          lineHeight: '1.6',
          marginBottom: '16px',
          whiteSpace: 'pre-wrap',
        }}>
          {(() => {
            const asetukset = JSON.parse(localStorage.getItem('kehokorjaamo_asetukset') || '{}')
            const palvelut  = asetukset.palvelut ?? []
            const palvelu   = palvelut.find(p => p.aktiivinen)
            return palvelu?.kuvaus || 'Ei kuvausta tälle palvelulle.'
          })()}
        </div>
      )}

      <form onSubmit={lähetä} className="flex flex-col gap-5">

        {/* ── Osio 1: Rakenteelliset havainnot ────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 text-base mb-4">
            Rakenteelliset havainnot
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex flex-col gap-4">
              {VASEN_SARAKE.map(({ key, label }) => (
                <AlueKenttä
                  key={key}
                  avain={key}
                  label={label}
                  arvo={data.havainnot[key]}
                  onChange={päivitäHavainto}
                />
              ))}
            </div>
            <div className="flex flex-col gap-4">
              {OIKEA_SARAKE.map(({ key, label }) => (
                <AlueKenttä
                  key={key}
                  avain={key}
                  label={label}
                  arvo={data.havainnot[key]}
                  onChange={päivitäHavainto}
                />
              ))}
            </div>
          </div>

          {lisaatytKentat.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {lisaatytKentat.map(({ key, label }) => (
                <AlueKenttä
                  key={key}
                  avain={key}
                  label={label}
                  arvo={data.havainnot[key]}
                  onChange={päivitäHavainto}
                />
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            {lisaaKenttaAuki ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={uusiKenttaNimi}
                  onChange={(e) => setUusiKenttaNimi(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); lisaaKentta() }
                    if (e.key === 'Escape') { setLisaaKenttaAuki(false); setUusiKenttaNimi('') }
                  }}
                  placeholder="Kentän nimi..."
                  autoFocus
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={lisaaKentta}
                  className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Lisää
                </button>
                <button
                  type="button"
                  onClick={() => { setLisaaKenttaAuki(false); setUusiKenttaNimi('') }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-lg transition-colors"
                >
                  Peruuta
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLisaaKenttaAuki(true)}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                + Lisää kenttä
              </button>
            )}
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

        {/* ── Osio 3: Hoitoraportit ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 text-base">Hoitoraportit</h3>
            {!lisaaAuki && (
              <button
                type="button"
                onClick={() => setLisaaAuki(true)}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                + Lisää hoitokerta
              </button>
            )}
          </div>

          {lisaaAuki && (
            <div className="mb-4">
              <UusiRaporttiLomake
                onTallenna={tallennaRaportti}
                onPeruuta={() => setLisaaAuki(false)}
              />
            </div>
          )}

          {raportitUusimmastVanhimpaan.length > 0 ? (
            <div className="flex flex-col gap-3">
              {raportitUusimmastVanhimpaan.map((r) => (
                <RaporttiKortti key={r.id} raportti={r} />
              ))}
            </div>
          ) : (
            !lisaaAuki && (
              <p className="text-sm text-gray-400 text-center py-4">
                Ei vielä hoitoraportteja.
              </p>
            )
          )}
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
