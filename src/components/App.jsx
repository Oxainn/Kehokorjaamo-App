import { useState } from 'react'
import BodyMap from './BodyMap'
import TreatmentPlan from './TreatmentPlan'
import MuscleLibrary from './MuscleLibrary'
import Aftercare from './Aftercare'

const NAV_ITEMS = [
  { id: 'bodymap',       label: 'Kehokartta' },
  { id: 'treatment',    label: 'Hoitosuunnitelma' },
  { id: 'muscles',      label: 'Lihaskirjasto' },
  { id: 'aftercare',    label: 'Jälkihoito' },
]

export default function App() {
  const [activeTab, setActiveTab]   = useState('bodymap')
  const [findings, setFindings]     = useState([])
  const [highlights, setHighlights] = useState([])

  const handleAnalyze = (f) => {
    setFindings(f)
    setActiveTab('treatment')
  }

  const handleTulos = (tulos) => {
    setHighlights(tulos?.toimenpiteet?.map((t) => t.rakenne).filter(Boolean) ?? [])
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-brand-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight">Kehokorjaamo</span>
          <span className="text-brand-100 text-sm">– lihashuolto-opas</span>
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
        {activeTab === 'bodymap'   && <BodyMap onAnalyze={handleAnalyze} />}
        {activeTab === 'treatment' && <TreatmentPlan findings={findings} onTulos={handleTulos} />}
        {activeTab === 'muscles'   && <MuscleLibrary highlights={highlights} />}
        {activeTab === 'aftercare' && <Aftercare />}
      </main>

      <footer className="bg-white border-t border-gray-200 text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} Kehokorjaamo – kaikki oikeudet pidätetään
      </footer>
    </div>
  )
}
