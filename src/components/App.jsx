import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { tallennaKaynti, tallennaAsiakas, haeAsiakkaat, haeKaynnitViikolle, haeUudetAsiakkaat, merkitseKasitellyksi } from '../lib/db'
import Login from './Login'
import ClientForm from './ClientForm'
import ClinicalObservations from './ClinicalObservations'
import BodyMap from './BodyMap'
import TreatmentPlan from './TreatmentPlan'
import MuscleLibrary from './MuscleLibrary'
import Aftercare from './Aftercare'
import Settings from './Settings'
import ProductBoard from './ProductBoard'
import KuvaAnalyysi from './KuvaAnalyysi'
import Asiakasrekisteri from './Asiakasrekisteri'
import EsitietoKatselu from './EsitietoKatselu'

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
  const [avattuEsitieto, setAvattuEsitieto] = useState(null)
  const [kayntiPvm, setKayntiPvm]           = useState(new Date().toISOString().split('T')[0])
  const [vahvistusViesti, setVahvistusViesti] = useState('')
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
    }
  }, [kayttaja])

  const tarkistaEsitiedot = async () => {
    const { data, error } = await supabase
      .from('esitiedot')
      .select()
      .eq('kasitelty', false)
      .order('created_at', { ascending: false })
    if (error) { console.error('Esitiedot haku:', error); return }
    setUudetAsiakkaat(data ?? [])
  }

  useEffect(() => {
    tarkistaEsitiedot()
    const interval = setInterval(tarkistaEsitiedot, 10000)
    return () => clearInterval(interval)
  }, [])

  const päivitäLista = () => haeAsiakkaat().then(setAsiakasLista)

  const avaaAsiakkaana = async (esitiedot) => {
    await supabase.from('esitiedot').update({ kasitelty: true }).eq('id', esitiedot.id)

    const { data, error } = await supabase
      .from('asiakkaat')
      .insert({
        nimi:              esitiedot.nimi,
        syntymaaika:       esitiedot.syntymaaika || null,
        sahkoposti:        esitiedot.sahkoposti,
        puhelin:           esitiedot.puhelin,
        hoitoon_syy:       esitiedot.hoitoon_syy,
        kontraindikaatiot: esitiedot.kontraindikaatiot,
        merkinnät:         esitiedot.merkinnät,
        hoitaja_id:        kayttaja?.id,
      })
      .select()

    if (error) {
      console.error('Asiakas tallennus:', error)
    } else {
      console.log('Asiakas tallennettu:', data)
    }

    setAsiakas({ ...esitiedot, supabase_id: data?.[0]?.id })
    setUudetAsiakkaat(prev => prev.filter(e => e.id !== esitiedot.id))
    setAvattuEsitieto(null)
    päivitäLista()
    setActiveTab('client')
    setVahvistusViesti(`${esitiedot.nimi} tallennettu!`)
    setTimeout(() => setVahvistusViesti(''), 3000)
  }

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

  const avaaKaynti = (kaynti, asiakas) => {
    setAsiakas({ ...asiakas, supabase_id: asiakas.id })
    if (kaynti.havainnot)  setHavainnot(kaynti.havainnot)
    if (kaynti.loyodokset) setFindings(kaynti.loyodokset)
    setActiveTab('clinical')
  }

  const avaaUusiKaynti = (asiakas) => {
    setAsiakas({ ...asiakas, supabase_id: asiakas.id })
    setHavainnot(null)
    setFindings([])
    setActiveTab('clinical')
  }

  const hoitajaId = kayttaja?.id

  const tallennaHoitokaynti = async () => {
    if (!asiakas?.supabase_id) return
    try {
      const { data, error } = await supabase
        .from('hoitokaynit')
        .insert({
          asiakas_id:        asiakas.supabase_id,
          hoitaja_id:        hoitajaId,
          pvm:               new Date().toISOString().split('T')[0],
          havainnot:         havainnot,
          findings:          findings,
          hoitosuunnitelma:  treatmentPlan,
          kuva_analyysit:    kuvaAnalyysiMittaukset,
          jalkihoito:        null,
          muistiinpanot:     null,
        })
        .select()
      if (error) throw error
      console.log('Hoitokäynti tallennettu:', data)
      alert('Hoitokäynti tallennettu!')
    } catch (err) {
      console.error('Tallennus epäonnistui:', err)
      alert('Tallennus epäonnistui — tarkista yhteys')
    }
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
      kuvaAnalyysiMittaukset,
      kayntiPvm
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

  if (!kayttaja) return <Login />

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
              onClick={() => supabase.auth.signOut()}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--color-text-secondary, white)',
              }}
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
          {NAV_ITEMS_BASE.slice(3).map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`py-3 px-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {asiakas && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#E1F5EE', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '13px', color: '#085041', flex: 1 }}>
            Asiakas: {asiakas.nimi}
          </span>
          <input
            type="date"
            value={kayntiPvm}
            onChange={e => setKayntiPvm(e.target.value)}
            style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #9FE1CB', background: 'white' }}
          />
          <button
            onClick={tallennaKokoKaynti}
            style={{ padding: '6px 14px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}
          >
            💾 Tallenna käynti
          </button>
          <button
            onClick={tallennaHoitokaynti}
            disabled={!asiakas?.supabase_id}
            style={{
              padding: '10px 20px',
              background: asiakas?.supabase_id ? '#1D9E75' : '#e2e8f0',
              color: asiakas?.supabase_id ? 'white' : '#999',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: asiakas?.supabase_id ? 'pointer' : 'not-allowed',
            }}
          >
            💾 Tallenna hoitokäynti
          </button>
        </div>
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div style={{ display: activeTab === 'koti' ? 'block' : 'none' }}>
          {(() => {
            const viimeisinPvm = asiakasLista.reduce((acc, a) => {
              const d = a.luotu ? new Date(a.luotu) : null
              return d && (!acc || d > acc) ? d : acc
            }, null)
            return (
              <section className="flex flex-col gap-6">
                {vahvistusViesti && (
                  <div style={{ padding: '10px 16px', background: '#E1F5EE', borderRadius: '8px', color: '#085041', fontSize: '13px', fontWeight: '500', marginBottom: '12px', textAlign: 'center' }}>
                    ✓ {vahvistusViesti}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">Tervetuloa</h2>
                  {asiakas && (
                    <p className="mt-1 text-gray-500 text-sm">Aktiivinen asiakas: <span className="font-medium text-brand-700">{asiakas.nimi}</span></p>
                  )}
                </div>

                {/* Uudet esitiedot */}
                {uudetAsiakkaat.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#085041', margin: '0 0 8px' }}>
                      Odottavat esitiedot — {uudetAsiakkaat.length}
                    </p>
                    {uudetAsiakkaat.map(u => (
                      <div key={u.id} style={{ padding: '12px', border: '1px solid #9FE1CB', borderRadius: '8px', background: '#E1F5EE', marginBottom: '8px' }}>
                        <p style={{ fontSize: '13px', fontWeight: '500', color: '#085041', margin: '0 0 2px' }}>{u.nimi}</p>
                        <p style={{ fontSize: '11px', color: '#0F6E56', margin: '0 0 8px' }}>{u.palvelu} · {u.sahkoposti}</p>
                        {u.hoitoon_syy && (
                          <p style={{ fontSize: '11px', color: '#0F6E56', margin: '0 0 8px', fontStyle: 'italic' }}>"{u.hoitoon_syy}"</p>
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setAvattuEsitieto(u)
                              setActiveTab('esitiedot-katselu')
                            }}
                            style={{ flex: 1, padding: '8px', background: 'transparent', color: '#085041', border: '1px solid #1D9E75', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Avaa esitiedot
                          </button>
                          <button
                            onClick={() => avaaAsiakkaana(u)}
                            style={{ flex: 1, padding: '8px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                          >
                            Tallenna asiakkaaksi →
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

        <div style={{ display: activeTab === 'esitiedot-katselu' ? 'block' : 'none' }}>
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setActiveTab('koti')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#1D9E75', fontWeight: '500', padding: 0 }}
            >
              ← Takaisin
            </button>
          </div>
          {avattuEsitieto && (
            <EsitietoKatselu
              esitiedot={avattuEsitieto}
              onSulje={() => setActiveTab('koti')}
              onTallennaAsiakkaaksi={avaaAsiakkaana}
            />
          )}
        </div>

        <div style={{ display: activeTab === 'rekisteri' ? 'block' : 'none' }}>
          <Asiakasrekisteri
            onAvaaAsiakas={avaaAsiakas}
            onAvaaKaynti={(a, k) => avaaKaynti(k, a)}
            onUusiKaynti={avaaUusiKaynti}
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
            asiakasData={asiakas}
            onComplete={handleAsiakas}
            hoitajaId={hoitajaId}
          />
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
          <ProductBoard hoitajaId={hoitajaId} />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} Kehokorjaamo – kaikki oikeudet pidätetään
      </footer>
    </div>
  )
}
