import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { tallennaKaynti, haeAsiakkaat, haeKaynnitViikolle, haeUudetAsiakkaat, merkitseKasitellyksi } from '../lib/db'
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

export default function App() {
  const [activeTab, setActiveTab]         = useState('koti')
  const [asiakas, setAsiakas]             = useState(null)
  const [havainnot, setHavainnot]         = useState(null)
  const [findings, setFindings]           = useState([])
  const [analysisKey, setAnalysisKey]     = useState(0)
  const [highlights, setHighlights]       = useState([])
  const [treatmentPlan, setTreatmentPlan] = useState(null)
  const [kuvaAnalyysiMittaukset, setKuvaAnalyysiMittaukset] = useState([])
  const [asiakasLista, setAsiakasLista]     = useState([])
  const [kaynteja, setKaynteja]             = useState(0)
  const [uudetAsiakkaat, setUudetAsiakkaat] = useState([])
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
    if (kayttaja) {
      haeAsiakkaat().then(setAsiakasLista)
      haeKaynnitViikolle().then(setKaynteja)
      haeUudetAsiakkaat().then(setUudetAsiakkaat)
    }
  }, [kayttaja])

  const päivitäLista = () => haeAsiakkaat().then(setAsiakasLista)

  const kayntejaTallaViikolla = () => {
    const viikkoAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return asiakasLista.filter(a =>
      a.viimeisinKaynti && new Date(a.viimeisinKaynti) > viikkoAgo
    ).length
  }

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

                {/* Uudet esitiedot */}
                {uudetAsiakkaat.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#085041', margin: 0 }}>
                        Odottavat esitiedot — {uudetAsiakkaat.length}
                      </p>
                      <button
                        onClick={async () => {
                          for (const u of uudetAsiakkaat) {
                            await merkitseKasitellyksi(u.id)
                          }
                          setUudetAsiakkaat([])
                        }}
                        style={{ fontSize: '11px', color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Tyhjennä kaikki
                      </button>
                    </div>
                    {uudetAsiakkaat.map(u => (
                      <div key={u.id} style={{ padding: '12px', border: '1px solid #9FE1CB', borderRadius: '8px', background: '#E1F5EE', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <p style={{ fontSize: '13px', fontWeight: '500', color: '#085041', margin: 0 }}>{u.nimi}</p>
                          <span style={{ fontSize: '11px', color: '#0F6E56' }}>
                            {new Date(u.luotu).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#0F6E56', margin: '0 0 8px' }}>{u.palvelu} · {u.sahkoposti}</p>
                        {u.hoitoon_syy && (
                          <p style={{ fontSize: '11px', color: '#0F6E56', margin: '0 0 8px', fontStyle: 'italic' }}>"{u.hoitoon_syy}"</p>
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={async () => {
                              const uusiAsiakas = {
                                nimi: u.nimi,
                                sahkoposti: u.sahkoposti,
                                puhelin: u.puhelin,
                                hoitoon_syy: u.hoitoon_syy,
                                kipuaste: u.kipuaste,
                                supabase_id: null,
                              }
                              await merkitseKasitellyksi(u.id)
                              setUudetAsiakkaat(prev => prev.filter(x => x.id !== u.id))
                              setAsiakas(null)
                              setActiveTab('koti')
                              requestAnimationFrame(() => {
                                setAsiakas(uusiAsiakas)
                                setActiveTab('client')
                              })
                            }}
                            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', border: 'none', background: '#1D9E75', color: 'white', cursor: 'pointer', fontWeight: '500', flex: 1 }}
                          >
                            Avaa asiakkaana →
                          </button>
                          <button
                            onClick={async () => {
                              await merkitseKasitellyksi(u.id)
                              setUudetAsiakkaat(prev => prev.filter(x => x.id !== u.id))
                            }}
                            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', border: '1px solid #0F6E56', background: 'transparent', color: '#0F6E56', cursor: 'pointer' }}
                          >
                            Poista
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tilastokortit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                    <p className="text-3xl font-bold text-brand-700">{asiakasLista.length}</p>
                    <p className="text-sm text-gray-500 mt-1">Asiakkaita yhteensä</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                    <p className="text-3xl font-bold text-brand-700">{kaynteja}</p>
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
