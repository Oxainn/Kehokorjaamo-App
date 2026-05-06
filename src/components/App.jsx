import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { normalisoiAsiakas } from '../utils/asiakas'
import { haeUusienAsiakkaidenMaara, aloitaUusiKaynti, haeAsiakkaanKontraindikaatiot } from '../lib/db'

// Dev: TESTI-asiakas haetaan sähköpostilla jotta sama koodi toimii sekä
// Live- että Kehitys-DB:ssä (id:t eroavat tietokantojen välillä). Näkyy
// rekisterissä nimellä "TESTI Asiakas — Älä koske". Vain "🧪 Testaa
// B-lomake" -nappi käyttää tätä — ei tuotantokäyttöä.
const TESTI_ASIAKAS_SAHKOPOSTI = 'testi@example.com'
import { useOnline } from '../hooks/useOnline'
import { useEscKey } from '../hooks/useEscKey'
import { jononKoko } from '../lib/offlineDB'
import { synkronoiJono } from '../lib/offlineSync'
import Login from './Login'
import Settings from './Settings'
import Asiakasrekisteri from './Asiakasrekisteri'
import AsiakaslomakeRenderoijalla from './AsiakaslomakeRenderoijalla'
import UudenAsiakkaanTarkistus from './UudenAsiakkaanTarkistus'
// AB-T5c: uusi yhdistetyn lomakkeen flow "+ Uusi asiakas" -näkymälle
import HoitajanPalveluValinta from './HoitajanPalveluValinta'
import UusiKayntiContainer from './UusiKayntiContainer'
import Hoitokirjaus from './Hoitokirjaus'
import JulkinenLomake from './JulkinenLomake'
import PalveluValinta from './PalveluValinta'
import { tunnistaYmparisto, ymparistoTeksti, ymparistoVarit, vastapariYmparisto, YMPARISTO } from '../lib/ymparisto'

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

  // Dev-oikotie: /dev/b-lomake avaa Hoitokirjauksen TESTI-asiakkaan
  // kontekstissa heti kun kirjautuminen on valmis (bookmarkattava).
  const onDevBLomakePolku = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.location.pathname === '/dev/b-lomake'
  }, [])

  // Testimoodi — käytössä kun B-lomake on avattu "🧪 Testaa B-lomake"
  // -napilla tai /dev/b-lomake-reitillä. Hoitokirjaus näyttää bannerin
  // ja "Nollaa TESTI-data" -napin kun true.
  const [testimoodi, setTestimoodi] = useState(false)

  useEffect(() => {
    const url   = new URL(window.location.href)
    const error = url.searchParams.get('error')
    const code  = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    /* eslint-disable no-console */
    console.log('[app debug] OAuth-callback useEffect:', {
      href:   window.location.href,
      search: window.location.search,
      hash:   window.location.hash,
      code:   code ? `${code.slice(0, 8)}…(${code.length})` : null,
      state:  state ? `${state.slice(0, 8)}…(${state.length})` : null,
      error,
    })
    /* eslint-enable no-console */
    if (error) {
      console.error('OAuth-virhe:', error)
      setLataaAuth(false)
      setKayttaja(null)
      window.history.replaceState({}, '', '/')
    }
    // Code/state-paramien pyyhintä siirretty SIGNED_IN-event-listeneriin
    // (alempana useEffectissä) jotta Supabasen detectSessionInUrl-flowilla
    // on aikaa kuluttaa code_verifier ennen URLin muutosta.
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setKayttaja(data.session?.user ?? null)
      setLataaAuth(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setKayttaja(session?.user ?? null)
      // PKCE-flow valmis → siisti URL-parametrit (?code=, ?state=) pois.
      // Ei timer-pohjaista raceia detectSessionInUrl:n kanssa, koska tämä
      // ajetaan vasta kun Supabase on lukenut codeen ja vaihtanut sen
      // sessioksi onnistuneesti.
      if (event === 'SIGNED_IN' && typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        if (url.searchParams.has('code') || url.searchParams.has('state')) {
          window.history.replaceState({}, '', '/')
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const hoitajaId = kayttaja?.id
  // Admin-rajaus + ympäristö-rajaus dev-työkaluille.
  // showDevTools yhdistää nämä: dev-työkalut näkyvät vain Oxalle
  // Kehitys-ympäristössä. Live-puolella piilossa kaikilta — myös Oxalta —
  // koska Liven puolelta ei kuulu testata testidatalla.
  // Vaihe C asiakasportaalin yhteydessä isAdmin laajennetaan hoitaja-rooliin.
  const isAdmin = kayttaja?.email === 'oxainn@gmail.com'
  const showDevTools = isAdmin && tunnistaYmparisto() === YMPARISTO.KEHITYS

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

  // AB-T5c: "+ Uusi asiakas" -flow:n valittu palvelu. Null = palveluvalinta auki,
  // set = UusiKayntiContainer renderöityy ja ohjaa lomakkeen avauksen.
  const [valittuPalvelu, setValittuPalvelu] = useState(null)

  // KIIRE-FIX 6 (D-malli): käynnillisen asiakkaan päänappi avaa olemassa olevan
  // hoitokäynnin muokkaustilassa. Asetetaan onAvaaKaynti-callbackissa →
  // UusiKayntiContainer renderöityy olemassaKayntiId-propilla joka ohittaa
  // luoTyhjaAsiakas + aloitaUusiKaynti -setupin ja lataa snapshotin
  // hoitokaynnit.lomakepohja_versio_id:n kautta. Null = uuden käynnin polku.
  const [olemassaKayntiId, setOlemassaKayntiId] = useState(null)

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
    setTestimoodi(false)
    setValittuPalvelu(null)   // AB-T5c: nollaa palveluvalinta poistuessa flow:sta
    setOlemassaKayntiId(null) // KIIRE-FIX 6: nollaa avattu käynti
    setNakyma('rekisteri')
  }

  // Dev: avaa B-lomake suoraan TESTI-asiakkaan luonnos-käynnillä.
  // Käyttää olemassa olevaa luonnosta jos sellainen on, muuten kutsuu
  // aloitaUusiKaynti:tä normaaliin tapaan. Vahvistus-modaali ohitetaan.
  const avaaTestiBLomake = useCallback(async () => {
    if (!hoitajaId) {
      alert('Kirjaudu ensin sisään.')
      return
    }
    const { data: testi, error: asErr } = await supabase
      .from('asiakkaat')
      .select('*')
      .eq('hoitaja_id', hoitajaId)
      .eq('sahkoposti', TESTI_ASIAKAS_SAHKOPOSTI)
      .maybeSingle()
    if (asErr || !testi) {
      alert('TESTI-asiakasta ei löydy DB:stä sähköpostilla "' + TESTI_ASIAKAS_SAHKOPOSTI + '". Luo ensin testiasiakas tähän DB:hen.')
      return
    }

    const { data: olemassa } = await supabase
      .from('hoitokaynnit')
      .select('id')
      .eq('asiakas_id', testi.id)
      .eq('tila', 'luonnos')
      .order('luotu', { ascending: false })
      .limit(1)
      .maybeSingle()

    let hkId = olemassa?.id ?? null
    if (!hkId) {
      const tulos = await aloitaUusiKaynti(testi.id)
      if (tulos.virhe) {
        alert('TESTI-käynnin luonti epäonnistui: ' + tulos.virhe)
        return
      }
      hkId = tulos.hoitokayntiId
      if (!hkId) {
        alert('TESTI-käynti aloitettiin mutta hoitokäyntiä ei luotu — kokeile uudelleen')
        return
      }
    }

    setAsiakas(normalisoiAsiakas(testi))
    setHoitokayntiId(hkId)
    setTestimoodi(true)
    setNakyma('hoitokirjaus')
  }, [hoitajaId])

  // Auto-avaa /dev/b-lomake-reitiltä kerran kun kirjautuminen on valmis.
  useEffect(() => {
    if (!onDevBLomakePolku || !kayttaja) return
    avaaTestiBLomake()
    // Siisti URL pois, ettei reitti uudelleenlaukea Back-napilla
    window.history.replaceState({}, '', '/')
  }, [onDevBLomakePolku, kayttaja, avaaTestiBLomake])

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
  // VB3 — yhteinen Esc-hook (paalla=true vain kun modaali auki)
  useEscKey(() => setVahvistusAuki(false), vahvistusAuki)

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
          © {new Date().getFullYear()} Kalevalapaja
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>Kehokorjaamo</span>
            {/* Ympäristö-indikaattori + erillinen siirtymiskytkin.
                Indikaattori on pelkkä infoa (ei klikattava), kytkin avaa
                vastapari-ympäristön uudessa välilehdessä. Tämä korvaa
                aiemman "klikattava chip" -ratkaisun jossa Live-puolen
                klikkaus laukesi vahingossa Asetukset-näkymään. */}
            {(() => {
              const y = tunnistaYmparisto()
              const varit = ymparistoVarit(y)
              const teksti = ymparistoTeksti(y)
              const vp = vastapariYmparisto(y)
              // Siirtymiskytkimen täyttö = kohdeympäristön väri jotta
              // käyttäjä näkee heti mihin klikkaus vie:
              //   Avaa LIVE → vihreä täyttö (LIVE-väri)
              //   Avaa KEHITYS → oranssi täyttö (KEHITYS-väri)
              const kytkimenTyyli = vp?.teksti === 'LIVE'
                ? { taustaPaa: '#16a34a', taustaHover: '#15803d', teksti: 'white',   reuna: '#15803d' }
                : vp?.teksti === 'KEHITYS'
                ? { taustaPaa: '#f59e0b', taustaHover: '#d97706', teksti: '#7c2d12', reuna: '#d97706' }
                : { taustaPaa: '#9ca3af', taustaHover: '#6b7280', teksti: 'white',   reuna: '#6b7280' }
              return (
                <>
                  {/* A) Indikaattori — ei klikattava */}
                  <span
                    title={`Ympäristö: ${teksti}`}
                    style={{
                      ...varit,
                      fontSize:       '11px',
                      padding:        '4px 10px',
                      minHeight:      '24px',
                      borderRadius:   '6px',
                      fontWeight:     700,
                      letterSpacing:  '0.05em',
                      cursor:         'default',
                      textTransform:  'uppercase',
                      display:        'inline-flex',
                      alignItems:     'center',
                    }}
                  >
                    {teksti}
                  </span>
                  {/* B) Siirtymiskytkin — vain admin-käyttäjälle. Avaa
                       vastapari-ympäristön uudessa välilehdessä. */}
                  {vp && isAdmin && (
                    <a
                      href={vp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title={`Avaa ${vp.teksti}-versio uudessa välilehdessä`}
                      style={{
                        fontSize:       '11px',
                        padding:        '4px 8px 4px 10px',
                        minHeight:      '24px',
                        borderRadius:   '6px',
                        border:         `1px solid ${kytkimenTyyli.reuna}`,
                        background:     kytkimenTyyli.taustaPaa,
                        color:          kytkimenTyyli.teksti,
                        fontWeight:     700,
                        cursor:         'pointer',
                        textDecoration: 'none',
                        display:        'inline-flex',
                        alignItems:     'center',
                        gap:            '4px',
                        letterSpacing:  '0.02em',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = kytkimenTyyli.taustaHover }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = kytkimenTyyli.taustaPaa }}
                    >
                      <span>→ Avaa {vp.teksti}</span>
                      <span aria-hidden="true" style={{ fontSize: '10px', opacity: 0.85 }}>↗</span>
                    </a>
                  )}
                </>
              )
            })()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* DEV — testaa B-lomake suoraan TESTI-asiakkaalla.
                Näkyy vain Kehitys-ympäristössä admin-käyttäjälle.
                Live-puolelta piilossa (myös Oxalta) — sieltä ei kuuluu
                testata testidatalla. */}
            {showDevTools && (
              <button
                onClick={avaaTestiBLomake}
                title="Avaa B-lomake TESTI-asiakkaan kontekstissa (dev-työkalu — ohittaa vahvistuksen)"
                style={{
                  fontSize:     '12px',
                  padding:      '6px 12px',
                  minHeight:    '32px',
                  borderRadius: '20px',
                  border:       '1px solid #fbbf24',
                  background:   '#f59e0b',
                  color:        '#7c2d12',
                  fontWeight:   700,
                  cursor:       'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                🧪 Testaa B-lomake · DEV
              </button>
            )}
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

      {/* SISÄLTÖALUE — leveä jotta Asetukset-dashboard pääsee koko näytön
          leveydelle isoilla monitoreilla. Pienillä näytöillä width: 100%
          toimii jouseksi. Lomakekentät ja listanrivit eivät leviä rumasti
          koska niillä on omat container-luokat. */}
      <main style={{ flex: 1, maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>

        {/* REKISTERI */}
        {nakyma === 'rekisteri' && (
          <Asiakasrekisteri
            hoitajaId={hoitajaId}
            refresh={rekisteriAvain}
            onValitseAsiakas={(a, palvelu = null) => {
              setAsiakas(normalisoiAsiakas(a))
              // KIIRE-FIX 2: jos rekisteri pystyi päättelemään yksiselitteisen
              // palvelun viimeisimmästä valmis-käynnistä, ohitetaan
              // HoitajanPalveluValinta-modaali ja avataan UusiKayntiContainer
              // suoraan kyseisellä palvelulla.
              if (palvelu) setValittuPalvelu(palvelu)
              setNakyma('kaynti')
            }}
            onAvaaKaynti={(a, kayntiId) => {
              // KIIRE-FIX 6 (D-malli): käynnillisen asiakkaan klikkaus avaa
              // viimeisimmän käynnin muokkaustilassa. UusiKayntiContainer
              // ohittaa setup-vaiheet kun olemassaKayntiId on annettu.
              setAsiakas(normalisoiAsiakas(a))
              setOlemassaKayntiId(kayntiId)
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

        {/* KIIRE-FIX 6 (D-malli): KÄYNTI — käynnillisen asiakkaan klikkaus
            avaa olemassa olevan käynnin LomakeRenderoijalla muokkaustilassa.
            Container hoitaa avaaKayntiUudelleen-kutsun jos käynti on lukittu. */}
        {nakyma === 'kaynti' && asiakas && asiakas.vahvistettu !== false && olemassaKayntiId && (
          <UusiKayntiContainer
            asiakasId={asiakas.id}
            olemassaKayntiId={olemassaKayntiId}
            onValmis={paluuRekisteriin}
            onPeruuta={paluuRekisteriin}
          />
        )}
        {/* AB-T6b: KÄYNTI — asiakas valittu rekisteristä.
            Vahvistettu + valittuPalvelu → container hallitsee oman yläpalkin.
            Container on erillinen lohko jotta App-yläpalkki ei näy. */}
        {nakyma === 'kaynti' && asiakas && asiakas.vahvistettu !== false && !olemassaKayntiId && valittuPalvelu && (
          <UusiKayntiContainer
            asiakasId={asiakas.id}
            palvelu={valittuPalvelu}
            onValmis={paluuRekisteriin}
            onPeruuta={paluuRekisteriin}
          />
        )}
        {/* Vahvistamaton-polku TAI ennen palvelun valintaa: App-yläpalkki + sisältö. */}
        {nakyma === 'kaynti' && asiakas && !olemassaKayntiId && (asiakas.vahvistettu === false || !valittuPalvelu) && (
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
              // Säilyy AB-T6b:n jälkeen vanhojen vahvistamattomien tietueiden käsittelyä varten.
              <UudenAsiakkaanTarkistus
                asiakas={asiakas}
                onValmis={paluuRekisteriin}
              />
            ) : (
              // AB-T6b: vahvistettu asiakas → palveluvalinta avautuu heti
              // (klikkaus rekisteristä = "aloita uusi käynti" -aikomus). Valinnan
              // jälkeen valittuPalvelu set ja UusiKayntiContainer renderöityy
              // ylläolevasta lohkosta. Vanha "+ Uusi käynti" -nappi +
              // AsiakaslomakeRenderoijalla -käyttö poistettu — Hoitokirjaus-näkymä
              // jää käyttämättä mutta säilyy repoon AB-T8:n siivoukseen.
              <HoitajanPalveluValinta
                auki={true}
                onValitse={(p) => setValittuPalvelu(p)}
                onSulje={paluuRekisteriin}
              />
            )}
          </div>
        )}
        {/* Vanha vahvistettu-haaran "+ Uusi käynti" -nappi + AsiakaslomakeRenderoijalla
            + vahvistusModaali poistettu AB-T6b:ssä — palveluvalinta avautuu suoraan.
            Tyhjä Fragment alla pitää JSX-rakenteen syntaksin pätevänä — voidaan
            poistaa kokonaan AB-T8:ssa kun setVahvistusAuki/kaynnistetaan/jne -tilat siivotaan. */}
        {false && (
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

        {/* AB-T5c: UUSI KÄYNTI — uuden asiakkaan + käynnin luonti yhdistetyllä lomakkeella.
            1. Ensin palveluvalinta-modaali (tai peruutus → rekisteriin)
            2. Palvelun valinnan jälkeen UusiKayntiContainer hoitaa setupin ja renderöi
               LomakeRenderoija:n auto-savella + "Tallenna käynti" -lukituksella.
            Vanha AsiakaslomakeRenderoijalla-polku säilyy 'kaynti'-näkymän
            olemassa olevien asiakkaiden flow:ssa kunnes AB-T6 korvaa myös sen. */}
        {nakyma === 'uusi-kaynti' && !valittuPalvelu && (
          <HoitajanPalveluValinta
            auki={true}
            onValitse={(p) => setValittuPalvelu(p)}
            onSulje={paluuRekisteriin}
          />
        )}
        {nakyma === 'uusi-kaynti' && valittuPalvelu && (
          <UusiKayntiContainer
            palvelu={valittuPalvelu}
            onValmis={paluuRekisteriin}
            onPeruuta={paluuRekisteriin}
          />
        )}

        {/* HOITOKIRJAUS — Vaihe B Pala B1, avautuu "+ Uusi käynti" -toiminnon jälkeen */}
        {nakyma === 'hoitokirjaus' && asiakas && hoitokayntiId && (
          <Hoitokirjaus
            asiakas={asiakas}
            hoitokayntiId={hoitokayntiId}
            testimoodi={testimoodi}
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
          <Settings hoitajaId={hoitajaId} isAdmin={isAdmin} showDevTools={showDevTools} />
        )}

      </main>

      <footer style={{ background: 'white', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#9ca3af', padding: '16px' }}>
        © {new Date().getFullYear()} Kalevalapaja – kaikki oikeudet pidätetään
      </footer>
    </div>
  )
}
