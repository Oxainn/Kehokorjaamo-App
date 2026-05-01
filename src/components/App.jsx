import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../services/supabase'
import { normalisoiAsiakas } from '../utils/asiakas'
import { haeUusienAsiakkaidenMaara, aloitaUusiKaynti, haeAsiakkaanKontraindikaatiot } from '../lib/db'
import { useOnline } from '../hooks/useOnline'
import { jononKoko } from '../lib/offlineDB'
import { synkronoiJono } from '../lib/offlineSync'
import Login from './Login'
import Settings from './Settings'
import Asiakasrekisteri from './Asiakasrekisteri'
import AsiakaslomakeRenderoijalla from './AsiakaslomakeRenderoijalla'
import UudenAsiakkaanTarkistus from './UudenAsiakkaanTarkistus'
import Hoitokirjaus from './Hoitokirjaus'
import JulkinenLomake from './JulkinenLomake'
import PalveluValinta from './PalveluValinta'

const ylaNav = [
  { id: 'rekisteri',    nimi: 'Asiakasrekisteri',  ikoni: '👥' },
  { id: 'uusi-kaynti', nimi: 'Lisää uusi asiakas', ikoni: '➕' },
  { id: 'asetukset',   nimi: 'Asetukset',           ikoni: '⚙️' },
]

export default function App() {
  const [nakyma, setNakyma]       = useState('rekisteri')
  const [asiakas, setAsiakas]     = useState(null)
  const [kayttaja, setKayttaja]   = useState(null)
  const [lataaAuth, setLataaAuth] = useState(true)
  // Vahvistamattomien asiakkaiden määrä — näytetään ylävalikon Asiakasrekisteri-
  // napin badge:ssa. Päivitetään pollauksella 30 s välein + aina kun
  // näkymä palaa rekisteriin (jolloin Tallenna asiakas -klikkaus heijastuu heti).
  const [uusienMaara, setUusienMaara] = useState(0)

  // Julkinen lomakenäkymä: ?palvelu=ID URL-parametri ohittaa kirjautumisen
  const julkinenPalveluId = useMemo(() => {
    if (typeof window === 'undefined') return null
    return new URL(window.location.href).searchParams.get('palvelu')
  }, [])

  // Julkinen palveluvalintasivu — kotisivulta tultaessa
  const onPalveluValintaPolku = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.location.pathname === '/uusi-asiakas'
  }, [])

  useEffect(() => {
    const url   = new URL(window.location.href)
    const error = url.searchParams.get('error')
    const code  = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (error || code || state) {
      setTimeout(() => window.history.replaceState({}, '', '/'), 100)
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

  const hoitajaId = kayttaja?.id

  // Avain joka pakottaa AsiakaslomakeRenderoijalla:n uudelleenrenderöinnin
  // (esitäytön uudelleenladauksen) kun "Uusi käynti" suljetaan ja avataan.
  const [kayntiAvain, setKayntiAvain] = useState(0)
  const [kaynnistetaan, setKaynnistetaan] = useState(false)
  // Aktiivisen hoitokirjauksen id (asetetaan kun "+ Uusi käynti" suoritetaan
  // ja avaa Hoitokirjaus-näkymän Vaihe B Pala B1).
  const [hoitokayntiId, setHoitokayntiId] = useState(null)
  // Avain joka triggaa Asiakasrekisterin asiakaslistan ja käyntipillerien
  // uudelleenladaukset. Kasvatetaan aina kun palaamme rekisteriin
  // operaation jälkeen (uusi käynti, vahvistus, lomakkeen tallennus).
  const [rekisteriAvain, setRekisteriAvain] = useState(0)

  // Pala B9b — online/offline-tila + offline-jonon synkronointi
  const online = useOnline()
  const [jonoa, setJonoa] = useState(0)
  const [synkronoidaan, setSynkronoidaan] = useState(false)
  const [synkViesti, setSynkViesti] = useState(null)

  // Päivitä jonon koko aina kun yhteys vaihtuu, sekä alkuun
  useEffect(() => {
    let peruttu = false
    jononKoko().then((n) => { if (!peruttu) setJonoa(n) })
    return () => { peruttu = true }
  }, [online, rekisteriAvain])

  // Yhteys palasi → automaattinen synkronointi taustalla
  useEffect(() => {
    if (!online) return
    let peruttu = false
    ;(async () => {
      const koko = await jononKoko()
      if (koko === 0) return
      setSynkronoidaan(true)
      const tulos = await synkronoiJono()
      if (peruttu) return
      setSynkronoidaan(false)
      const uusiKoko = await jononKoko()
      setJonoa(uusiKoko)
      if (tulos.onnistuneet > 0) {
        setSynkViesti(`Synkronoitu ${tulos.onnistuneet} muutosta`)
        setTimeout(() => setSynkViesti(null), 4000)
      } else if (tulos.virheet > 0) {
        setSynkViesti(`Synkronointi epäonnistui (${tulos.virheet} kpl jää jonoon)`)
        setTimeout(() => setSynkViesti(null), 6000)
      }
    })()
    return () => { peruttu = true }
  }, [online])

  function paluuRekisteriin() {
    setRekisteriAvain((n) => n + 1)
    setNakyma('rekisteri')
  }
  // Oma in-app vahvistusmodaali — selaimen window.confirm korvattu
  // jotta tyyli on yhtenäinen muun sovelluksen kanssa ja Esc-näppäin
  // toimii loogisesti.
  const [vahvistusAuki, setVahvistusAuki] = useState(false)

  async function vahvistaUusiKaynti() {
    if (!asiakas?.id) { setVahvistusAuki(false); return }
    if (kaynnistetaan) return
    setKaynnistetaan(true)
    const tulos = await aloitaUusiKaynti(asiakas.id)
    setKaynnistetaan(false)
    setVahvistusAuki(false)
    if (tulos.virhe) {
      alert('Uuden käynnin aloitus epäonnistui: ' + tulos.virhe)
      return
    }
    if (tulos.varoitus) {
      alert(tulos.varoitus)
    }
    // Avaa Hoitokirjaus-näkymä jos hoitokäynti-rivi luotiin onnistuneesti
    if (tulos.hoitokayntiId) {
      setHoitokayntiId(tulos.hoitokayntiId)
      setNakyma('hoitokirjaus')
    } else {
      // Reunatapaus: lomakeversio aloitettu mutta hoitokirjaus epäonnistui.
      // Pakota lomakkeen uudelleenlataus jotta esitäyttö hakee uuden version.
      setKayntiAvain((n) => n + 1)
    }
  }

  // Esc sulkee modaalin
  useEffect(() => {
    if (!vahvistusAuki) return
    const onKeyDown = (e) => { if (e.key === 'Escape') setVahvistusAuki(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [vahvistusAuki])

  // Hae kontraindikaatiot kun vahvistusmodaali avataan (Pala B2)
  const [vahvistusKontra, setVahvistusKontra] = useState([])
  useEffect(() => {
    if (!vahvistusAuki || !asiakas?.id) { setVahvistusKontra([]); return }
    let peruttu = false
    haeAsiakkaanKontraindikaatiot(asiakas.id).then((lista) => {
      if (!peruttu) setVahvistusKontra(lista)
    })
    return () => { peruttu = true }
  }, [vahvistusAuki, asiakas?.id])

  // Pollaa uusien asiakkaiden määrä 30 s välein + heti kun näkymä vaihtuu
  // rekisteriin (esim. "Tallenna asiakas" -klikkauksen jälkeen).
  useEffect(() => {
    if (!hoitajaId) { setUusienMaara(0); return }

    let peruttu = false
    const paivita = async () => {
      const maara = await haeUusienAsiakkaidenMaara(hoitajaId)
      if (!peruttu) setUusienMaara(maara)
    }

    paivita()
    const intervalli = setInterval(paivita, 30_000)
    return () => { peruttu = true; clearInterval(intervalli) }
  }, [hoitajaId, nakyma])

  const onYlaNav = (id) => {
    if (id === 'uusi-kaynti') {
      setAsiakas(null)
      setNakyma('uusi-kaynti')
    } else {
      setNakyma(id)
    }
  }

  const aktiivisenYlaNav = (nakyma === 'kaynti' || nakyma === 'uusi-kaynti') ? null : nakyma

  // Julkiset näkymät — asiakas saapuu kirjautumatta. Kaksi tapausta:
  //   /uusi-asiakas       → palveluvalintasivu (kortit)
  //   /?palvelu=ID        → palvelukohtainen lomake
  if (onPalveluValintaPolku || julkinenPalveluId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header style={{ background: '#085041', color: 'white', padding: '10px 16px' }}>
          <div className="max-w-5xl mx-auto" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>Kehokorjaamo</span>
          </div>
        </header>
        <main style={{ flex: 1 }}>
          {onPalveluValintaPolku
            ? <PalveluValinta />
            : <JulkinenLomake palveluId={julkinenPalveluId} />}
        </main>
        <footer style={{ background: 'white', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#9ca3af', padding: '16px' }}>
          © {new Date().getFullYear()} Kehokorjaamo
        </footer>
      </div>
    )
  }

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
        <div className="max-w-5xl mx-auto" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>Kehokorjaamo</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Pala B9b — online/offline-indikaattori + jonon koko */}
            <span
              title={online ? 'Yhteys palvelimeen on päällä' : 'Ei verkkoyhteyttä — muutokset tallentuvat selaimeen ja synkronoidaan kun yhteys palaa'}
              style={{
                fontSize:     '12px',
                padding:      '4px 10px',
                borderRadius: '999px',
                background:   online ? 'rgba(255,255,255,0.15)' : '#7f1d1d',
                color:        'white',
                fontWeight:   500,
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '6px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: online ? '#34d399' : '#fca5a5' }} />
              {synkronoidaan ? 'Synkronoidaan…'
                : online ? `Online${jonoa > 0 ? ` · ${jonoa} jonossa` : ''}`
                : `Offline${jonoa > 0 ? ` · ${jonoa} jonossa` : ''}`}
            </span>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{ fontSize: '12px', padding: '6px 12px', minHeight: '32px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', cursor: 'pointer', color: 'white' }}
            >
              Kirjaudu ulos
            </button>
          </div>
        </div>
        {synkViesti && (
          <div className="max-w-5xl mx-auto" style={{ marginTop: '6px', fontSize: '12px', color: '#a7f3d0' }}>
            {synkViesti}
          </div>
        )}
      </header>

      {/* YLÄNAVIGAATIO */}
      <nav style={{ background: 'white', borderBottom: '2px solid #e2e8f0', padding: '10px 16px' }}>
        <div className="max-w-5xl mx-auto" style={{ display: 'flex', gap: '8px' }}>
          {ylaNav.map(({ id, nimi, ikoni }) => {
            const naytaBadge = id === 'rekisteri' && uusienMaara > 0
            return (
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
                  position: 'relative',
                }}
                aria-label={naytaBadge ? `${nimi} (${uusienMaara} uutta)` : nimi}
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{ikoni}</span>
                <span>
                  {nimi}
                  {naytaBadge && (
                    <span style={{
                      marginLeft:    '6px',
                      display:       'inline-flex',
                      alignItems:    'center',
                      justifyContent: 'center',
                      minWidth:      '20px',
                      height:        '20px',
                      padding:       '0 6px',
                      borderRadius:  '10px',
                      background:    '#f59e0b',
                      color:         'white',
                      fontSize:      '11px',
                      fontWeight:    700,
                      lineHeight:    1,
                      verticalAlign: 'middle',
                    }}>
                      {uusienMaara}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* SISÄLTÖALUE */}
      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>

        {/* REKISTERI */}
        {nakyma === 'rekisteri' && (
          <Asiakasrekisteri
            hoitajaId={hoitajaId}
            refresh={rekisteriAvain}
            onValitseAsiakas={(a) => {
              setAsiakas(normalisoiAsiakas(a))
              setNakyma('kaynti')
            }}
            onSiirryArkistoon={() => setNakyma('arkisto')}
          />
        )}

        {/* ARKISTO — pehmeästi poistetut asiakkaat */}
        {nakyma === 'arkisto' && (
          <Asiakasrekisteri
            hoitajaId={hoitajaId}
            refresh={rekisteriAvain}
            arkistoTila
            onTakaisinRekisteriin={paluuRekisteriin}
          />
        )}

        {/* KÄYNTI — asiakas valittu */}
        {nakyma === 'kaynti' && asiakas && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 0 12px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <button
                onClick={paluuRekisteriin}
                style={{ fontSize: '14px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1D9E75', fontWeight: '500', padding: '10px 8px', minHeight: '44px' }}
              >
                ← Rekisteri
              </button>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#085041' }}>
                {asiakas.nimi}
              </span>
            </div>
            {asiakas.vahvistettu === false ? (
              // Vahvistamaton asiakas → tarkistusnäkymä joka EI muokkaa lomakeversiota.
              // "Tallenna asiakas" -nappi on tarkistusnäkymässä sisällä.
              <UudenAsiakkaanTarkistus
                asiakas={asiakas}
                onValmis={paluuRekisteriin}
              />
            ) : (
              // Vahvistettu asiakas → "+ Uusi käynti" -toimintonappi yläreunassa
              // sekä lomakerenderöijä jolla muokataan asiakkaan ainoaa lomaketta.
              <>
                <button
                  type="button"
                  onClick={() => setVahvistusAuki(true)}
                  disabled={kaynnistetaan || !online}
                  title={!online ? 'Uuden käynnin aloitus vaatii verkkoyhteyden' : ''}
                  style={{
                    width:        '100%',
                    minHeight:    '52px',
                    marginBottom: '16px',
                    padding:      '14px',
                    borderRadius: '12px',
                    border:       'none',
                    background:   '#1D9E75',
                    color:        'white',
                    fontSize:     '15px',
                    fontWeight:   700,
                    letterSpacing: '0.03em',
                    cursor:       kaynnistetaan || !online ? 'not-allowed' : 'pointer',
                    opacity:      kaynnistetaan || !online ? 0.5 : 1,
                    boxShadow:    '0 1px 3px rgba(29, 158, 117, 0.25)',
                  }}
                >
                  {!online ? '🛜 + Uusi käynti (vaatii verkon)'
                    : kaynnistetaan ? 'Aloitetaan uutta käyntiä…'
                    : '+ Uusi käynti'}
                </button>
                <AsiakaslomakeRenderoijalla
                  key={`${asiakas.id}:${kayntiAvain}`}
                  asiakas={asiakas}
                  onValmis={paluuRekisteriin}
                />

                {/* Vahvistusmodaali — korvaa selaimen window.confirm */}
                {vahvistusAuki && (
                  <div
                    onClick={() => !kaynnistetaan && setVahvistusAuki(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="uusi-kaynti-otsikko"
                    style={{
                      position:       'fixed',
                      inset:          0,
                      background:     'rgba(0, 0, 0, 0.6)',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      padding:        '16px',
                      zIndex:         1000,
                    }}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background:    'white',
                        borderRadius:  '16px',
                        padding:       '24px',
                        maxWidth:      '440px',
                        width:         '100%',
                        boxShadow:     '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display:       'flex',
                        flexDirection: 'column',
                        gap:           '16px',
                      }}
                    >
                      <div>
                        <h3
                          id="uusi-kaynti-otsikko"
                          style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}
                        >
                          Aloita uusi käynti?
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                          Nykyinen lomake lukittuu käyntihistoriaan eikä sitä voi enää muokata.
                        </p>
                        {/* Pala B2: kontraindikaatio-varoitus ennen hoitokirjauksen avautumista */}
                        {vahvistusKontra.length > 0 && (
                          <div style={{
                            marginTop:    '12px',
                            background:   '#fef2f2',
                            border:       '1.5px solid #dc2626',
                            borderRadius: '10px',
                            padding:      '10px 14px',
                            fontSize:     '13px',
                            color:        '#7f1d1d',
                            lineHeight:   1.5,
                          }}>
                            <strong style={{ color: '#991b1b' }}>⚠️ Kontraindikaatio:</strong>{' '}
                            {vahvistusKontra.join(' · ')}
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#991b1b' }}>
                              Harkitse hoidon soveltuvuutta ennen aloitusta.
                            </p>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setVahvistusAuki(false)}
                          disabled={kaynnistetaan}
                          style={{
                            padding:      '10px 18px',
                            borderRadius: '10px',
                            border:       '1px solid #e5e7eb',
                            background:   'transparent',
                            color:        '#374151',
                            fontSize:     '14px',
                            fontWeight:   500,
                            cursor:       kaynnistetaan ? 'not-allowed' : 'pointer',
                            opacity:      kaynnistetaan ? 0.5 : 1,
                          }}
                        >
                          Peru
                        </button>
                        <button
                          type="button"
                          onClick={vahvistaUusiKaynti}
                          disabled={kaynnistetaan}
                          autoFocus
                          style={{
                            padding:      '10px 18px',
                            borderRadius: '10px',
                            border:       'none',
                            background:   '#1D9E75',
                            color:        'white',
                            fontSize:     '14px',
                            fontWeight:   600,
                            cursor:       kaynnistetaan ? 'wait' : 'pointer',
                            opacity:      kaynnistetaan ? 0.7 : 1,
                          }}
                        >
                          {kaynnistetaan ? 'Aloitetaan…' : 'Aloita käynti'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* UUSI KÄYNTI — uuden asiakkaan luonti tyhjällä lomakkeella */}
        {nakyma === 'uusi-kaynti' && (
          <AsiakaslomakeRenderoijalla
            asiakas={null}
            onValmis={paluuRekisteriin}
          />
        )}

        {/* HOITOKIRJAUS — Vaihe B Pala B1, avautuu "+ Uusi käynti" -toiminnon jälkeen */}
        {nakyma === 'hoitokirjaus' && asiakas && hoitokayntiId && (
          <Hoitokirjaus
            asiakas={asiakas}
            hoitokayntiId={hoitokayntiId}
            onValmis={() => {
              setHoitokayntiId(null)
              paluuRekisteriin()
            }}
            onPeru={() => {
              // Käynti jää 'luonnos'-tilaan DB:hen, voi myöhemmin avata
              // jatkamaan (Pala B7 tms). Tässä palaan vain palaa rekisteriin.
              setHoitokayntiId(null)
              paluuRekisteriin()
            }}
          />
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
