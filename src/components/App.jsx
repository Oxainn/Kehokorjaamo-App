import { useState, useEffect, useRef } from 'react'
import ClientForm from './ClientForm'
import ClinicalObservations from './ClinicalObservations'
import BodyMap from './BodyMap'
import TreatmentPlan from './TreatmentPlan'
import MuscleLibrary from './MuscleLibrary'
import Aftercare from './Aftercare'

const NAV_ITEMS = [
  { id: 'client',    label: 'Asiakastiedot' },
  { id: 'clinical',  label: 'Havainnot' },
  { id: 'bodymap',   label: 'Kehokartta' },
  { id: 'treatment', label: 'Hoitosuunnitelma' },
  { id: 'muscles',   label: 'Lihakset' },
  { id: 'aftercare', label: 'Jälkihoito' },
]


function EsitiedotPane({ lista, onAvaa, onPoista, onSulje }) {
  if (!lista.length) return null
  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">
          Odottavat esitiedot
          <span className="ml-2 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {lista.length}
          </span>
        </span>
        <button onClick={onSulje} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>
      <ul className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
        {lista.map(e => (
          <li key={e._key} className="px-4 py-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {e.etunimi} {e.sukunimi}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(e.aikaleima).toLocaleString('fi-FI', {
                    day: 'numeric', month: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                onClick={() => onPoista(e)}
                className="flex-shrink-0 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Poista
              </button>
            </div>
            {e.hoitoon_syy && (
              <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-3">
                {e.hoitoon_syy}
              </p>
            )}
            <button
              onClick={() => onAvaa(e)}
              className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Avaa asiakkaana →
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab]         = useState('client')
  const [asiakas, setAsiakas]             = useState(null)
  const [havainnot, setHavainnot]         = useState(null)
  const [findings, setFindings]           = useState([])
  const [analysisKey, setAnalysisKey]     = useState(0)
  const [highlights, setHighlights]       = useState([])
  const [treatmentPlan, setTreatmentPlan] = useState(null)
  const [esitiedot, setEsitiedot]         = useState([])
  const [paneAuki, setPaneAuki]           = useState(false)
  const [clientFormKey, setClientFormKey] = useState(0)
  const [esitäytöData, setEsitäytöData]   = useState(null)
  const esitäytöRef                       = useRef(null)

  useEffect(() => {
    const tarkista = () => {
      const lista = Object.keys(localStorage)
        .filter(k => k.startsWith('esitiedot_'))
        .map(k => ({ ...JSON.parse(localStorage.getItem(k)), _key: k }))
        .sort((a, b) => b._key.localeCompare(a._key))
      setEsitiedot(lista)
    }
    tarkista()
    window.addEventListener('storage', tarkista)
    window.addEventListener('focus', tarkista)
    const interval = setInterval(tarkista, 3000)
    return () => {
      window.removeEventListener('storage', tarkista)
      window.removeEventListener('focus', tarkista)
      clearInterval(interval)
    }
  }, [])

  const handleAsiakas = (asiakasData) => {
    setAsiakas(asiakasData)
    setActiveTab('clinical')
  }

  const handleHavainnot = (havainnotData) => {
    setHavainnot(havainnotData)
    setActiveTab('bodymap')
  }

  const handleAnalyze = (f) => {
    setFindings(f)
    setAnalysisKey(k => k + 1)
    setActiveTab('treatment')
  }

  const handleResult = (plan) => {
    setTreatmentPlan(plan)
    setHighlights(plan?.toimenpiteet?.map(t => t.rakenne).filter(Boolean) ?? [])
  }

  const poistaEsitiedot = (esitietoEntry) => {
    localStorage.removeItem(esitietoEntry._key)
    setEsitiedot(tarkistaEsitiedot())
  }

  const avaaNäkymä = (esitietoEntry) => {
    localStorage.removeItem(esitietoEntry._key)
    setEsitiedot(tarkistaEsitiedot())
    setPaneAuki(false)

    const asiakasData = {
      nimi:        `${esitietoEntry.etunimi ?? ''} ${esitietoEntry.sukunimi ?? ''}`.trim(),
      syntymaaika: esitietoEntry.syntymaaika  ?? '',
      puhelin:     esitietoEntry.puhelin      ?? '',
      sahkoposti:  esitietoEntry.sahkoposti   ?? '',
      hoitoon_syy: esitietoEntry.hoitoon_syy  ?? '',
      kipuaste:    esitietoEntry.kipuaste      ?? 0,
      kontraindikaatiot: esitietoEntry.kontraindikaatiot ?? {},
      sairaudet:   esitietoEntry.lisatiedot   ?? '',
    }

    // Ref takaa että ClientForm saa datan heti mountissa
    // ennen kuin React-tila ehtii propagoitua
    esitäytöRef.current = asiakasData
    setEsitäytöData(asiakasData)
    setClientFormKey(k => k + 1)
    setActiveTab('client')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-brand-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight">Kehokorjaamo</span>
            <span className="text-brand-100 text-sm">– lihashuolto-opas</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Esitiedot-badge */}
            {esitiedot.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setPaneAuki(v => !v)}
                  className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                >
                  {esitiedot.length} uutta
                </button>
                {paneAuki && (
                  <EsitiedotPane
                    lista={esitiedot}
                    onAvaa={avaaNäkymä}
                    onPoista={poistaEsitiedot}
                    onSulje={() => setPaneAuki(false)}
                  />
                )}
              </div>
            )}

            {/* Asiakas / vaihda */}
            {asiakas ? (
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">{asiakas.nimi}</span>
                <button
                  onClick={() => setActiveTab('client')}
                  className="text-brand-200 hover:text-white text-xs underline transition-colors"
                >
                  vaihda
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('client')}
                className="text-brand-200 hover:text-white text-sm transition-colors"
              >
                + Uusi asiakas
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`py-3 px-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div style={{ display: activeTab === 'client'    ? 'block' : 'none' }}>
          <ClientForm
            key={clientFormKey}
            esitäytö={esitäytöRef.current ?? esitäytöData}
            onComplete={handleAsiakas}
          />
        </div>
        <div style={{ display: activeTab === 'clinical'  ? 'block' : 'none' }}>
          <ClinicalObservations asiakasData={asiakas} onComplete={handleHavainnot} />
        </div>
        <div style={{ display: activeTab === 'bodymap'   ? 'block' : 'none' }}>
          <BodyMap onAnalyze={handleAnalyze} />
        </div>
        <div style={{ display: activeTab === 'treatment' ? 'block' : 'none' }}>
          <TreatmentPlan key={analysisKey} findings={findings} havainnot={havainnot} onResult={handleResult} />
        </div>
        <div style={{ display: activeTab === 'muscles'   ? 'block' : 'none' }}>
          <MuscleLibrary highlights={highlights} />
        </div>
        <div style={{ display: activeTab === 'aftercare' ? 'block' : 'none' }}>
          <Aftercare findings={findings} treatmentPlan={treatmentPlan} asiakas={asiakas} />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} Kehokorjaamo – kaikki oikeudet pidätetään
      </footer>
    </div>
  )
}
