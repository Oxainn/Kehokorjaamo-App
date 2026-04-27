import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { tallennaKaynti } from '../lib/db'
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
  { id: 'rekisteri',     nimi: 'Asiakasrekisteri', ikoni: '👥' },
  { id: 'uusi-kaynti',  nimi: 'Uusi käynti',       ikoni: '➕' },
  { id: 'tuotehallinta', nimi: 'Tuotehallinta',    ikoni: '📋' },
  { id: 'asetukset',    nimi: 'Asetukset',          ikoni: '⚙️' },
]

const kayntiNav = [
  { id: 'asiakastiedot',    nimi: 'Asiakastiedot' },
  { id: 'havainnot',        nimi: 'Havainnot' },
  { id: 'kehokartta',       nimi: 'Kehokartta' },
  { id: 'kuva-analyysi',    nimi: 'Kuva-analyysi' },
  { id: 'hoitosuunnitelma', nimi: 'Hoitosuunnitelma' },
  { id: 'lihakset',         nimi: 'Lihakset' },
  { id: 'jalkihoito',       nimi: 'Jälkihoito' },
]

export default function App() {
  const [nakyma, setNakyma]           = useState('rekisteri')
  const [aktiivinen, setAktiivinen]   = useState('asiakastiedot')
  const [asiakas, setAsiakas]         = useState(null)
  const [havainnot, setHavainnot]     = useState(null)
  const [findings, setFindings]       = useState([])
  const [analysisKey, setAnalysisKey] = useState(0)
  const [highlights, setHighlights]   = useState([])
  const [treatmentPlan, setTreatmentPlan] = useState(null)
  const [kuvaAnalyysiMittaukset, setKuvaAnalyysiMittaukset] = useState([])
  const [asiakasNappiTila, setAsiakasNappiTila] = useState('tallenna')
  const [esitiedotLista, setEsitiedotLista] = useState([])
  const [avattuEsitieto, setAvattuEsitieto] = useState(null)
  const [kayntiPvm, setKayntiPvm]     = useState(new Date().toISOString().split('T')[0])
  const [vahvistusViesti, setVahvistusViesti] = useState('')
  const [kayttaja, setKayttaja]       = useState(null)
  const [lataaAuth, setLataaAuth]     = useState(true)

  useEffect(() => {
    const url = new URL(window.location.href)
    const error = url.searchParams.get('error')
    const code  = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (error || code || state) {
      setTimeout(() => {
        window.history.replaceState({}, '', '/')
      }, 100)

      if (error) {
        console.error('OAuth-virhe:', error)
        setLataaAuth(false)
        setKayttaja(null)
      }
    }
  }, [])

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
    const haeEsitiedot = async () => {
      const { data } = await supabase
        .from('esitiedot').select()
        .eq('kasitelty', false).order('created_at', { ascending: false })
      setEsitiedotLista(data ?? [])
    }
    haeEsitiedot()
    const interval = setInterval(haeEsitiedot, 10000)
    return () => clearInterval(interval)
  }, [])

  const hoitajaId = kayttaja?.id

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
      hoitaja_id:        hoitajaId,
    }).select()
    if (error) console.error('Asiakas tallennus:', error)
    setEsitiedotLista(prev => prev.filter(e => e.id !== esitiedot.id))
    setAsiakas({ ...esitiedot, supabase_id: data?.[0]?.id })
    setAvattuEsitieto(null)
    setNakyma('kaynti')
    setAktiivinen('asiakastiedot')
    setVahvistusViesti(`${esitiedot.nimi} tallennettu!`)
    setTimeout(() => setVahvistusViesti(''), 3000)
  }

  const tallennaKokoKaynti = async () => {
    if (!asiakas?.supabase_id) { alert('Tallenna asiakastiedot ensin'); return }
    const tulos = await tallennaKaynti(
      asiakas.supabase_id, havainnot, findings, null,
      kuvaAnalyysiMittaukset, kayntiPvm
    )
    if (tulos) alert('Käynti tallennettu!')
    else alert('Tallennus epäonnistui')
  }

  const tallennaAsiakasYlapalkki = async () => {
    if (!asiakas || asiakas.supabase_id) return
    const { data, error } = await supabase.from('asiakkaat').insert({
      hoitaja_id:       hoitajaId,
      nimi:             asiakas.nimi,
      syntymaaika:      asiakas.syntymaaika || null,
      sahkoposti:       asiakas.sahkoposti,
      puhelin:          asiakas.puhelin,
      lahiosoite:       asiakas.lahiosoite,
      postinumero:      asiakas.postinumero,
      postitoimipaikka: asiakas.postitoimipaikka,
      ammatti:          asiakas.ammatti,
      pituus:           asiakas.pituus || null,
      paino:            asiakas.paino || null,
    }).select()
    if (error) { console.error('Asiakas tallennus:', error); return }
    setAsiakas(prev => ({ ...prev, supabase_id: data[0].id }))
    setAsiakasNappiTila('tallennettu')
    setTimeout(() => setAsiakasNappiTila('tallenna'), 2000)
  }

  const onYlaNav = (id) => {
    if (id === 'uusi-kaynti') {
      setAsiakas(null)
      setHavainnot(null)
      setFindings([])
      setTreatmentPlan(null)
      setHighlights([])
      setKuvaAnalyysiMittaukset([])
      setNakyma('uusi-kaynti')
      setAktiivinen('asiakastiedot')
    } else {
      setNakyma(id)
    }
  }

  const handleHavainnot = (havainnotData) => {
    setHavainnot(havainnotData)
    setAktiivinen('kehokartta')
  }

  const handleAnalyze = (f) => {
    setFindings(f)
    setAnalysisKey(k => k + 1)
    setAktiivinen('hoitosuunnitelma')
  }

  const handleResult = (plan) => {
    setTreatmentPlan(plan)
    setHighlights(plan?.toimenpiteet?.map(t => t.rakenne).filter(Boolean) ?? [])
  }

  const aktiivisenYlaNav = (nakyma === 'kaynti' || nakyma === 'uusi-kaynti') ? null : nakyma

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

      {vahvistusViesti && (
        <div style={{ padding: '8px 16px', background: '#E1F5EE', color: '#085041', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>
          ✓ {vahvistusViesti}
        </div>
      )}

      {/* SISÄLTÖALUE */}
      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>

        {/* REKISTERI */}
        {nakyma === 'rekisteri' && (
          avattuEsitieto ? (
            <div>
              <button
                onClick={() => setAvattuEsitieto(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#1D9E75', fontWeight: '500', padding: '0 0 16px', display: 'block' }}
              >
                ← Takaisin
              </button>
              <EsitietoKatselu
                esitiedot={avattuEsitieto}
                onSulje={() => setAvattuEsitieto(null)}
                onTallennaAsiakkaaksi={avaaAsiakkaana}
              />
            </div>
          ) : (
            <div>
              <Asiakasrekisteri
                hoitajaId={hoitajaId}
                esitiedotLista={esitiedotLista}
                onValitseAsiakas={(a) => {
                  setAsiakas({ ...a, supabase_id: a.id })
                  setNakyma('kaynti')
                  setAktiivinen('asiakastiedot')
                }}
                onEsikatseluAsiakas={(e) => setAvattuEsitieto(e)}
                onAvaaAsiakkaana={avaaAsiakkaana}
              />
            </div>
          )
        )}

        {/* KÄYNTI */}
        {nakyma === 'kaynti' && asiakas && (
          <div>
            {/* Asiakkaan nimi + takaisin + tallenna asiakas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 0 8px', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}>
              <button
                onClick={() => setNakyma('rekisteri')}
                style={{ fontSize: '13px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1D9E75', fontWeight: '500', padding: '4px 0' }}
              >
                ← Rekisteri
              </button>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#085041' }}>
                {asiakas.nimi}
              </span>
              {!asiakas.supabase_id && (
                <button
                  onClick={tallennaAsiakasYlapalkki}
                  style={{ padding: '6px 14px', background: asiakasNappiTila === 'tallennettu' ? '#059669' : '#1D9E75', color: 'white', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', marginLeft: 'auto' }}
                >
                  {asiakasNappiTila === 'tallennettu' ? '✓ Tallennettu' : 'Tallenna asiakas'}
                </button>
              )}
            </div>

            {/* Hoitokäynnin välilehdet */}
            <nav style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '4px 0 12px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
              {kayntiNav.map(({ id, nimi }) => (
                <button
                  key={id}
                  onClick={() => setAktiivinen(id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    background: aktiivinen === id ? '#1D9E75' : 'transparent',
                    color: aktiivinen === id ? 'white' : '#374151',
                    fontSize: '13px',
                    fontWeight: aktiivinen === id ? '600' : '400',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  {nimi}
                </button>
              ))}
            </nav>

            {/* Sisältö */}
            {aktiivinen === 'asiakastiedot' && (
              <ClientForm
                asiakasData={asiakas}
                onComplete={(data) => { setAsiakas(data); setAktiivinen('havainnot') }}
                hoitajaId={hoitajaId}
              />
            )}
            {aktiivinen === 'havainnot' && (
              <ClinicalObservations
                asiakasData={asiakas}
                onComplete={handleHavainnot}
                onSiirryVälilehdelle={setAktiivinen}
                mittaukset={kuvaAnalyysiMittaukset}
              />
            )}
            {aktiivinen === 'kehokartta' && (
              <BodyMap onAnalyze={handleAnalyze} />
            )}
            {aktiivinen === 'kuva-analyysi' && (
              <KuvaAnalyysi
                asiakasId={asiakas?.supabase_id}
                onTallenna={(data) => setKuvaAnalyysiMittaukset(data?.mittaukset ?? [])}
              />
            )}
            {aktiivinen === 'hoitosuunnitelma' && (
              <TreatmentPlan key={analysisKey} findings={findings} havainnot={havainnot} onResult={handleResult} />
            )}
            {aktiivinen === 'lihakset' && (
              <MuscleLibrary highlights={highlights} />
            )}
            {aktiivinen === 'jalkihoito' && (
              <div>
                <Aftercare findings={findings} treatmentPlan={treatmentPlan} />
                <div style={{ marginTop: '32px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 2px' }}>Tallenna hoitokäynti</p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Tallentaa havainnot, hoitosuunnitelman ja jälkihoidon</p>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="date"
                      value={kayntiPvm}
                      onChange={e => setKayntiPvm(e.target.value)}
                      style={{ fontSize: '12px', padding: '5px 10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    />
                    <button
                      onClick={tallennaKokoKaynti}
                      style={{ padding: '8px 20px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      💾 Tallenna käynti
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* UUSI KÄYNTI */}
        {nakyma === 'uusi-kaynti' && (
          <ClientForm
            hoitajaId={hoitajaId}
            onComplete={(data) => {
              setAsiakas(data)
              setNakyma('kaynti')
              setAktiivinen('havainnot')
            }}
          />
        )}

        {/* TUOTEHALLINTA */}
        {nakyma === 'tuotehallinta' && (
          <ProductBoard hoitajaId={hoitajaId} />
        )}

        {/* ASETUKSET */}
        {nakyma === 'asetukset' && (
          <Settings hoitajaId={hoitajaId} />
        )}

      </main>

      <footer style={{ background: 'white', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#9ca3af', padding: '16px' }}>
        © {new Date().getFullYear()} Kehokorjaamo – kaikki oikeudet pidätetään
      </footer>
    </div>
  )
}
