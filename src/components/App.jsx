import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { tallennaKaynti, haeAsiakkaat } from '../lib/db'
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

const ylaNav = [
  { id: 'rekisteri',    nimi: 'Asiakasrekisteri', ikoni: '👥' },
  { id: 'uusi-kaynti', nimi: 'Uusi käynti',       ikoni: '➕' },
  { id: 'tuotehallinta', nimi: 'Tuotehallinta',   ikoni: '📋' },
  { id: 'asetukset',   nimi: 'Asetukset',          ikoni: '⚙️' },
]

const kayntiNav = [
  { id: 'asiakastiedot',   nimi: 'Asiakastiedot' },
  { id: 'havainnot',       nimi: 'Havainnot' },
  { id: 'kehokartta',      nimi: 'Kehokartta' },
  { id: 'kuva-analyysi',   nimi: 'Kuva-analyysi' },
  { id: 'hoitosuunnitelma', nimi: 'Hoitosuunnitelma' },
  { id: 'lihakset',        nimi: 'Lihakset' },
  { id: 'jalkihoito',      nimi: 'Jälkihoito' },
]

const KAYNTI_IDS = new Set(kayntiNav.map(t => t.id))

export default function App() {
  const [activeTab, setActiveTab]         = useState('rekisteri')
  const [asiakas, setAsiakas]             = useState(null)
  const [havainnot, setHavainnot]         = useState(null)
  const [findings, setFindings]           = useState([])
  const [analysisKey, setAnalysisKey]     = useState(0)
  const [highlights, setHighlights]       = useState([])
  const [treatmentPlan, setTreatmentPlan] = useState(null)
  const [kuvaAnalyysiMittaukset, setKuvaAnalyysiMittaukset] = useState([])
  const [asiakasLista, setAsiakasLista]   = useState([])
  const [uudetAsiakkaat, setUudetAsiakkaat] = useState([])
  const [avattuEsitieto, setAvattuEsitieto] = useState(null)
  const [kayntiPvm, setKayntiPvm]         = useState(new Date().toISOString().split('T')[0])
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
    if (kayttaja) haeAsiakkaat().then(setAsiakasLista)
  }, [kayttaja])

  const tarkistaEsitiedot = async () => {
    const { data, error } = await supabase
      .from('esitiedot').select()
      .eq('kasitelty', false).order('created_at', { ascending: false })
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
    const { data, error } = await supabase.from('asiakkaat').insert({
      nimi:              esitiedot.nimi,
      syntymaaika:       esitiedot.syntymaaika || null,
      sahkoposti:        esitiedot.sahkoposti,
      puhelin:           esitiedot.puhelin,
      hoitoon_syy:       esitiedot.hoitoon_syy,
      kontraindikaatiot: esitiedot.kontraindikaatiot,
      merkinnät:         esitiedot.merkinnät,
      hoitaja_id:        kayttaja?.id,
    }).select()
    if (error) console.error('Asiakas tallennus:', error)
    setAsiakas({ ...esitiedot, supabase_id: data?.[0]?.id })
    setUudetAsiakkaat(prev => prev.filter(e => e.id !== esitiedot.id))
    setAvattuEsitieto(null)
    päivitäLista()
    setActiveTab('asiakastiedot')
    setVahvistusViesti(`${esitiedot.nimi} tallennettu!`)
    setTimeout(() => setVahvistusViesti(''), 3000)
  }

  const avaaAsiakas = (a) => {
    setAsiakas({ ...a, supabase_id: a.id })
    setActiveTab('asiakastiedot')
  }

  const avaaKaynti = (kaynti, a) => {
    setAsiakas({ ...a, supabase_id: a.id })
    if (kaynti.havainnot)  setHavainnot(kaynti.havainnot)
    if (kaynti.loyodokset) setFindings(kaynti.loyodokset)
    setActiveTab('havainnot')
  }

  const aloitaUusiKaynti = () => {
    setAsiakas(null)
    setHavainnot(null)
    setFindings([])
    setTreatmentPlan(null)
    setHighlights([])
    setKuvaAnalyysiMittaukset([])
    setActiveTab('asiakastiedot')
  }

  const hoitajaId = kayttaja?.id

  const tallennaKokoKaynti = async () => {
    if (!asiakas?.supabase_id) { alert('Tallenna asiakastiedot ensin'); return }
    const tulos = await tallennaKaynti(
      asiakas.supabase_id, havainnot, findings, null,
      kuvaAnalyysiMittaukset, kayntiPvm
    )
    if (tulos) { päivitäLista(); alert('Käynti tallennettu!') }
    else alert('Tallennus epäonnistui')
  }

  const handleAsiakas = (asiakasData) => {
    setAsiakas(asiakasData)
    päivitäLista()
    setActiveTab('havainnot')
  }

  const handleHavainnot = (havainnotData) => {
    setHavainnot(havainnotData)
    setActiveTab('kehokartta')
  }

  const handleAnalyze = (f) => {
    setFindings(f)
    setAnalysisKey(k => k + 1)
    setActiveTab('hoitosuunnitelma')
  }

  const handleResult = (plan) => {
    setTreatmentPlan(plan)
    setHighlights(plan?.toimenpiteet?.map(t => t.rakenne).filter(Boolean) ?? [])
  }

  const onYlaNav = (id) => {
    if (id === 'uusi-kaynti') aloitaUusiKaynti()
    else setActiveTab(id)
  }

  const aktiivisenYlaNav = KAYNTI_IDS.has(activeTab) ? null : activeTab

  if (lataaAuth) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '14px', color: '#666' }}>
      Ladataan...
    </div>
  )

  if (!kayttaja) return <Login />

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* TOPBAR */}
      <header style={{ background: '#085041', color: 'white', padding: '10px 16px' }}>
        <div className="max-w-5xl mx-auto" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>Kehokorjaamo</span>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', cursor: 'pointer', color: 'white' }}
          >
            Kirjaudu ulos
          </button>
        </div>
      </header>

      {/* YLÄNAVIGAATIO */}
      <nav style={{ background: 'white', borderBottom: '2px solid #e2e8f0', padding: '10px 16px' }}>
        <div className="max-w-5xl mx-auto" style={{ display: 'flex', gap: '8px' }}>
          {ylaNav.map(({ id, nimi, ikoni }) => (
            <button
              key={id}
              onClick={() => onYlaNav(id)}
              style={{
                flex: 1,
                padding: '10px 6px',
                borderRadius: '10px',
                border: `2px solid ${aktiivisenYlaNav === id ? '#1D9E75' : '#e2e8f0'}`,
                background: aktiivisenYlaNav === id ? '#E1F5EE' : 'white',
                color: aktiivisenYlaNav === id ? '#085041' : '#374151',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{ikoni}</span>
              <span>{nimi}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* HOITOKÄYNNIN TASO — näkyy vain kun asiakas valittu */}
      {asiakas && (
        <div style={{ background: '#F0FAF6', borderBottom: '1px solid #9FE1CB' }}>
          <div className="max-w-5xl mx-auto" style={{ padding: '8px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#085041' }}>
                {asiakas.nimi}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="date"
                  value={kayntiPvm}
                  onChange={e => setKayntiPvm(e.target.value)}
                  style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #9FE1CB', background: 'white' }}
                />
                <button
                  onClick={tallennaKokoKaynti}
                  style={{ padding: '5px 14px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}
                >
                  💾 Tallenna käynti
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
              {kayntiNav.map(({ id, nimi }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: 'none',
                    background: activeTab === id ? '#1D9E75' : 'transparent',
                    color: activeTab === id ? 'white' : '#0F6E56',
                    fontSize: '12px',
                    fontWeight: activeTab === id ? '600' : '400',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  {nimi}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {vahvistusViesti && (
        <div style={{ padding: '8px 16px', background: '#E1F5EE', color: '#085041', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>
          ✓ {vahvistusViesti}
        </div>
      )}

      {/* SISÄLTÖALUE */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">

        {/* Rekisteri */}
        <div style={{ display: activeTab === 'rekisteri' ? 'block' : 'none' }}>
          {uudetAsiakkaat.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
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
                      onClick={() => { setAvattuEsitieto(u); setActiveTab('esitiedot-katselu') }}
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
          <Asiakasrekisteri
            onAvaaAsiakas={avaaAsiakas}
            onAvaaKaynti={(a, k) => avaaKaynti(k, a)}
            onUusiKaynti={(a) => {
              setAsiakas({ ...a, supabase_id: a.id })
              setHavainnot(null)
              setFindings([])
              setActiveTab('havainnot')
            }}
          />
        </div>

        {/* Esitietojen katselu */}
        <div style={{ display: activeTab === 'esitiedot-katselu' ? 'block' : 'none' }}>
          <button
            onClick={() => setActiveTab('rekisteri')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#1D9E75', fontWeight: '500', padding: '0 0 16px', display: 'block' }}
          >
            ← Takaisin
          </button>
          {avattuEsitieto && (
            <EsitietoKatselu
              esitiedot={avattuEsitieto}
              onSulje={() => setActiveTab('rekisteri')}
              onTallennaAsiakkaaksi={avaaAsiakkaana}
            />
          )}
        </div>

        {/* Hoitokäynnin välilehdet */}
        <div style={{ display: activeTab === 'asiakastiedot' ? 'block' : 'none' }}>
          <ClientForm asiakasData={asiakas} onComplete={handleAsiakas} hoitajaId={hoitajaId} />
        </div>
        <div style={{ display: activeTab === 'havainnot' ? 'block' : 'none' }}>
          <ClinicalObservations
            asiakasData={asiakas}
            onComplete={handleHavainnot}
            onSiirryVälilehdelle={setActiveTab}
            mittaukset={kuvaAnalyysiMittaukset}
          />
        </div>
        <div style={{ display: activeTab === 'kehokartta' ? 'block' : 'none' }}>
          <BodyMap onAnalyze={handleAnalyze} />
        </div>
        <div style={{ display: activeTab === 'kuva-analyysi' ? 'block' : 'none' }}>
          <KuvaAnalyysi
            asiakasId={asiakas?.id}
            onTallenna={(data) => setKuvaAnalyysiMittaukset(data?.mittaukset ?? [])}
          />
        </div>
        <div style={{ display: activeTab === 'hoitosuunnitelma' ? 'block' : 'none' }}>
          <TreatmentPlan key={analysisKey} findings={findings} havainnot={havainnot} onResult={handleResult} />
        </div>
        <div style={{ display: activeTab === 'lihakset' ? 'block' : 'none' }}>
          <MuscleLibrary highlights={highlights} />
        </div>
        <div style={{ display: activeTab === 'jalkihoito' ? 'block' : 'none' }}>
          <Aftercare findings={findings} treatmentPlan={treatmentPlan} asiakas={asiakas} />
        </div>

        {/* Ylänavin sivut */}
        <div style={{ display: activeTab === 'tuotehallinta' ? 'block' : 'none' }}>
          <ProductBoard hoitajaId={hoitajaId} />
        </div>
        <div style={{ display: activeTab === 'asetukset' ? 'block' : 'none' }}>
          <Settings />
        </div>

      </main>

      <footer className="bg-white border-t border-gray-200 text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} Kehokorjaamo – kaikki oikeudet pidätetään
      </footer>
    </div>
  )
}
