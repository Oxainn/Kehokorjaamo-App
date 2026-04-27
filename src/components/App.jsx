import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { tallennaKaynti, haeAsiakkaat } from '../lib/db'
import Auth from './Auth'
import ClientForm from './ClientForm'
import ClinicalObservations from './ClinicalObservations'
import BodyMap from './BodyMap'
import TreatmentPlan from './TreatmentPlan'
import MuscleLibrary from './MuscleLibrary'
import Aftercare from './Aftercare'
import Settings from './Settings'
import ProductBoard from './ProductBoard'
import KuvaAnalyysi from './KuvaAnalyysi'
import AsiakasHistoria from './AsiakasHistoria'
import Asiakasrekisteri from './Asiakasrekisteri'

const NAV_ITEMS_BASE = [
  { id: 'koti',      label: 'Koti' },
  { id: 'rekisteri', label: 'Asiakasrekisteri' },
  { id: 'client',   label: 'Asiakastiedot' },
  { id: 'clinical',  label: 'Havainnot' },
  { id: 'bodymap',   label: 'Kehokartta' },
  { id: 'kuva',      label: 'Kuva-analyysi' },
  { id: 'treatment', label: 'Hoitosuunnitelma' },
  { id: 'muscles',   label: 'Lihakset' },
  { id: 'aftercare', label: 'Jälkihoito' },
  { id: 'board',     label: 'Tuotehallinta' },
  { id: 'settings',  label: 'Asetukset' },
]

function lueEsitiedot() {
  return Object.keys(localStorage)
    .filter(k => k.startsWith('esitiedot_'))
    .map(k => ({ ...JSON.parse(localStorage.getItem(k)), _key: k }))
    .sort((a, b) => b._key.localeCompare(a._key))
}

function EsitiedotPane({ lista, onAvaa, onPoista, onTyhjennä, onSulje }) {
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
        <div className="flex items-center gap-3">
          <button
            onClick={onTyhjennä}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Tyhjennä kaikki
          </button>
          <button onClick={onSulje} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
      </div>
      <ul className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
        {lista.map(e => (
          <li key={e._key} className="px-4 py-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {e.nimi}
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
  const [activeTab, setActiveTab]         = useState('koti')
  const [asiakas, setAsiakas]             = useState(null)
  const [havainnot, setHavainnot]         = useState(null)
  const [findings, setFindings]           = useState([])
  const [analysisKey, setAnalysisKey]     = useState(0)
  const [highlights, setHighlights]       = useState([])
  const [treatmentPlan, setTreatmentPlan] = useState(null)
  const [esitiedot, setEsitiedot]         = useState([])
  const [paneAuki, setPaneAuki]           = useState(false)
  const [kuvaAnalyysiMittaukset, setKuvaAnalyysiMittaukset] = useState([])
  const [asiakasLista, setAsiakasLista] = useState([])
  const [clientFormKey, setClientFormKey] = useState(0)
  const [esitäytöData, setEsitäytöData]   = useState(null)
  const esitäytöRef                       = useRef(null)
  const [kayttaja, setKayttaja]           = useState(null)
  const [lataaAuth, setLataaAuth]         = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setKayttaja(data.session?.user ?? null)
      setLataaAuth(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setKayttaja(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (kayttaja) haeAsiakkaat().then(setAsiakasLista)
  }, [kayttaja])

  const päivitäLista = () => haeAsiakkaat().then(setAsiakasLista)

  const avaaAsiakas = (a) => {
    setAsiakas({ ...a, supabase_id: a.id })
    setActiveTab('client')
  }

  const tallennaKokoKaynti = async () => {
    if (!asiakas?.supabase_id) {
      alert('Tallenna asiakastiedot ensin')
      return
    }
    const tulos = await tallennaKaynti(
      asiakas.supabase_id,
      havainnot,
      findings,
      null,
      kuvaAnalyysiMittaukset
    )
    if (tulos) { päivitäLista(); alert('Käynti tallennettu!') }
    else alert('Tallennus epäonnistui')
  }

  const kirjauduUlos = async () => {
    await supabase.auth.signOut()
    setKayttaja(null)
  }

  useEffect(() => {
    const tarkista = () => setEsitiedot(lueEsitiedot())
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
    päivitäLista()
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

  const tyhjennäKaikki = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('esitiedot_'))
      .forEach(k => localStorage.removeItem(k))
    setEsitiedot([])
    setPaneAuki(false)
  }

  const poistaEsitiedot = (esitietoEntry) => {
    localStorage.removeItem(esitietoEntry._key)
    setEsitiedot(lueEsitiedot())
  }

  const avaaNäkymä = (esitietoEntry) => {
    localStorage.removeItem(esitietoEntry._key)
    setEsitiedot(lueEsitiedot())
    setPaneAuki(false)

    const asiakasData = {
      nimi:                esitietoEntry.nimi                ?? '',
      syntymaaika:         esitietoEntry.syntymaaika         ?? '',
      lahiosoite:          esitietoEntry.lahiosoite          ?? '',
      postinumero:         esitietoEntry.postinumero         ?? '',
      postitoimipaikka:    esitietoEntry.postitoimipaikka    ?? '',
      sahkoposti:          esitietoEntry.sahkoposti          ?? '',
      puhelin:             esitietoEntry.puhelin             ?? '',
      pituus:              esitietoEntry.pituus              ?? '',
      paino:               esitietoEntry.paino               ?? '',
      ammatti:             esitietoEntry.ammatti             ?? '',
      harrastukset:        esitietoEntry.harrastukset        ?? '',
      hoitoon_syy:         esitietoEntry.hoitoon_syy         ?? '',
      laakitys:            esitietoEntry.laakitys            ?? '',
      miten_loysi:         esitietoEntry.miten_loysi         ?? '',
      kipuaste:            esitietoEntry.kipuaste            ?? 0,
      kontraindikaatiot:   esitietoEntry.kontraindikaatiot   ?? {},
      allergia_lisatieto:  esitietoEntry.allergia_lisatieto  ?? '',
      tekonivel_lisatieto: esitietoEntry.tekonivel_lisatieto ?? '',
      raskaus_lisatieto:   esitietoEntry.raskaus_lisatieto   ?? '',
      merkinnät:           esitietoEntry.merkinnät           ?? {},
    }

    // Ref takaa että ClientForm saa datan heti mountissa
    // ennen kuin React-tila ehtii propagoitua
    esitäytöRef.current = asiakasData
    setEsitäytöData(asiakasData)
    setClientFormKey(k => k + 1)
    setActiveTab('client')
  }

  if (lataaAuth) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '14px', color: '#666' }}>
      Ladataan...
    </div>
  )

  if (!kayttaja) return <Auth />

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
                    onTyhjennä={tyhjennäKaikki}
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
            <button
              onClick={kirjauduUlos}
              className="text-brand-200 hover:text-white text-xs transition-colors border border-brand-500 hover:border-white rounded-lg px-3 py-1.5"
            >
              Kirjaudu ulos
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {NAV_ITEMS_BASE.slice(0, 3).map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`py-3 px-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              {label}
            </button>
          ))}
          {asiakas && (
            <button onClick={() => setActiveTab('historia')}
              className={`py-3 px-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'historia' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Historia
            </button>
          )}
          {NAV_ITEMS_BASE.slice(3).map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`py-3 px-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {asiakas && (
        <div style={{
          padding: '8px 16px',
          background: '#E1F5EE',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', color: '#085041' }}>
            Asiakas: {asiakas.nimi}
          </span>
          <button
            onClick={tallennaKokoKaynti}
            style={{
              padding: '6px 14px',
              background: '#1D9E75',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            💾 Tallenna käynti
          </button>
        </div>
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div style={{ display: activeTab === 'koti' ? 'block' : 'none' }}>
          {(() => {
            const viisi = [...asiakasLista].slice(0, 5)
            const viimeisinPvm = asiakasLista.reduce((acc, a) => {
              const d = a.luotu ? new Date(a.luotu) : null
              return d && (!acc || d > acc) ? d : acc
            }, null)
            return (
              <section className="flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">Tervetuloa</h2>
                  {asiakas && (
                    <p className="mt-1 text-gray-500 text-sm">Aktiivinen asiakas: <span className="font-medium text-brand-700">{asiakas.nimi}</span></p>
                  )}
                </div>

                {/* Tilastokortit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                    <p className="text-3xl font-bold text-brand-700">{asiakasLista.length}</p>
                    <p className="text-sm text-gray-500 mt-1">Asiakkaita yhteensä</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                    <p className="text-3xl font-bold text-brand-700">—</p>
                    <p className="text-sm text-gray-500 mt-1">Käyntejä tällä viikolla</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                    <p className="text-3xl font-bold text-brand-700">
                      {viimeisinPvm ? viimeisinPvm.toLocaleDateString('fi-FI') : '—'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Viimeisin asiakas</p>
                  </div>
                </div>

                {/* Viimeisimmät asiakkaat */}
                {viisi.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-semibold text-gray-800 text-base mb-3">Viimeisimmät asiakkaat</h3>
                    <div className="flex flex-col divide-y divide-gray-50">
                      {viisi.map(a => (
                        <div
                          key={a.id}
                          onClick={() => { setAsiakas({ ...a, supabase_id: a.id }); setActiveTab('client') }}
                          className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg cursor-pointer transition-colors"
                        >
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px', flexShrink: 0 }}>
                            {a.nimi?.trim()?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{a.nimi}</p>
                            <p className="text-xs text-gray-400 truncate">{a.sahkoposti || a.puhelin || '—'}</p>
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {a.luotu ? new Date(a.luotu).toLocaleDateString('fi-FI') : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pikanapit */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab('client')}
                    className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
                  >
                    + Uusi asiakas
                  </button>
                  <button
                    onClick={() => setActiveTab('rekisteri')}
                    className="flex-1 py-3 border-2 border-brand-600 text-brand-700 hover:bg-brand-50 font-semibold rounded-xl transition-colors text-sm"
                  >
                    Asiakasrekisteri
                  </button>
                </div>
              </section>
            )
          })()}
        </div>
        <div style={{ display: activeTab === 'rekisteri' ? 'block' : 'none' }}>
          <Asiakasrekisteri
            onAvaaAsiakas={(a) => {
              setAsiakas({ ...a, supabase_id: a.id })
              setActiveTab('client')
            }}
          />
        </div>
        <div style={{ display: activeTab === 'client' ? 'block' : 'none' }}>
          {asiakasLista.length > 0 && (
            <div style={{ marginBottom: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>Aiemmat asiakkaat</p>
              {asiakasLista.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px' }}>
                  Ei asiakkaita vielä — lisää ensimmäinen asiakas
                </p>
              ) : (
                asiakasLista.map(a => (
                  <div
                    key={a.id}
                    onClick={() => avaaAsiakas(a)}
                    style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: '10px',
                      padding: '9px 12px', borderRadius: '8px',
                      border: '1px solid #e2e8f0', cursor: 'pointer',
                      background: '#fafafa', marginBottom: '6px',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>{a.nimi}</span>
                    <span style={{ fontSize: '11px', color: '#999' }}>
                      {new Date(a.luotu).toLocaleDateString('fi-FI')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
          <ClientForm
            key={clientFormKey}
            esitäytö={esitäytöRef.current ?? esitäytöData}
            onComplete={handleAsiakas}
          />
        </div>
        <div style={{ display: activeTab === 'historia'  ? 'block' : 'none' }}>
          {asiakas ? <AsiakasHistoria asiakas={asiakas} /> : <p>Valitse ensin asiakas</p>}
        </div>
        <div style={{ display: activeTab === 'clinical'  ? 'block' : 'none' }}>
          <ClinicalObservations asiakasData={asiakas} onComplete={handleHavainnot} onSiirryVälilehdelle={(välilehti) => setActiveTab(välilehti)} mittaukset={kuvaAnalyysiMittaukset} />
        </div>
        <div style={{ display: activeTab === 'bodymap'   ? 'block' : 'none' }}>
          <BodyMap onAnalyze={handleAnalyze} />
        </div>
        <div style={{ display: activeTab === 'kuva'      ? 'block' : 'none' }}>
          <KuvaAnalyysi
            asiakasId={asiakas?.id}
            onTallenna={(data) => {
              console.log('onTallenna kutsuttu:', data)
              console.log('Mittaukset:', data?.mittaukset)
              setKuvaAnalyysiMittaukset(data?.mittaukset ?? [])
            }}
          />
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
        <div style={{ display: activeTab === 'settings'  ? 'block' : 'none' }}>
          <Settings />
        </div>
        <div style={{ display: activeTab === 'board'     ? 'block' : 'none' }}>
          <ProductBoard />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} Kehokorjaamo – kaikki oikeudet pidätetään
      </footer>
    </div>
  )
}
