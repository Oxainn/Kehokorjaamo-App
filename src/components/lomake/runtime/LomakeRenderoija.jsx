import { useState, useEffect, useMemo, useRef } from 'react'
import { useLomakepohja } from '../../../hooks/useLomakepohja'
import { validoiVastaukset } from '../../../lib/lomakeValidointi'
import {
  normalisoiPohjaRakenne,
  tallennaKayntiVastauksilla,
  lukitseKaynti,
  avaaKayntiUudelleen,
} from '../../../lib/db'
import { LomakeKontekstiProvider } from '../../../lib/lomakeKonteksti'
import NayttoYksiSivu from './nayttotyylit/NayttoYksiSivu'
import NayttoCKerrallaan from './nayttotyylit/NayttoCKerrallaan'
import NayttoAccordion from './nayttotyylit/NayttoAccordion'

const NAYTTOTYYLIT = {
  yksi_sivu: NayttoYksiSivu,
  c:         NayttoCKerrallaan,
  accordion: NayttoAccordion,
}

// AB-T4b: auto-save debounce 3s — riittävä kirjoitustauko ettei jokainen
// merkki laukaise tallennusta, mutta käyttäjä saa nopean palautteen.
const AUTO_SAVE_DEBOUNCE_MS = 3000
// AB-T4b: virhetilanteen jälkeen yritetään uudestaan 30s päästä
const RETRY_VIIVE_MS = 30000

const tilaTyyli = {
  fontSize:   '14px',
  color:      '#6b7280',
  textAlign:  'center',
  padding:    '32px 16px',
}

const virheTyyli = {
  ...tilaTyyli,
  color:        '#b91c1c',
  background:   '#fef2f2',
  borderRadius: '12px',
  border:       '1px solid #fecaca',
}

const yhteenvetoTyyli = {
  background:   '#fef2f2',
  border:       '1px solid #fecaca',
  borderRadius: '12px',
  padding:      '12px 16px',
  color:        '#991b1b',
  fontSize:     '13px',
  lineHeight:   1.5,
}

// AB-T4b: tallennustila-indikaattorin tyylit
const tallennusIndikatorTyyli = (tila) => ({
  display:      'flex',
  alignItems:   'center',
  gap:          '8px',
  padding:      '6px 12px',
  borderRadius: '8px',
  fontSize:     '12px',
  fontWeight:   '500',
  background:
    tila === 'tallennetaan' ? '#eff6ff' :
    tila === 'tallennettu'  ? '#f0fdf4' :
    tila === 'virhe'        ? '#fef2f2' : 'transparent',
  color:
    tila === 'tallennetaan' ? '#1e40af' :
    tila === 'tallennettu'  ? '#065f46' :
    tila === 'virhe'        ? '#991b1b' : '#9ca3af',
  border:
    tila === 'tallennetaan' ? '1px solid #bfdbfe' :
    tila === 'tallennettu'  ? '1px solid #bbf7d0' :
    tila === 'virhe'        ? '1px solid #fecaca' : 'none',
})

const ristiriitaTaustaTyyli = {
  position:       'fixed',
  inset:          0,
  background:     'rgba(0,0,0,0.5)',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  zIndex:         50,
  padding:        '16px',
}

const ristiriitaSisaltoTyyli = {
  background:   'white',
  borderRadius: '16px',
  padding:      '24px',
  maxWidth:     '420px',
  width:        '100%',
  boxShadow:    '0 10px 40px rgba(0,0,0,0.2)',
}

function muotoileKlo(date) {
  if (!date) return ''
  return date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
}

// AB-T4c: lukutila-lippu yläosassa kun käynti on 'valmis'
const lukutilaLippuTyyli = {
  display:        'flex',
  alignItems:     'center',
  gap:            '10px',
  padding:        '12px 16px',
  borderRadius:   '10px',
  background:     '#f0fdf4',     // emerald-50
  border:         '1px solid #bbf7d0',  // emerald-200
  color:          '#065f46',     // emerald-800
  fontSize:       '13px',
  fontWeight:     '600',
}

// AB-T4c: "Tallenna käynti" -nappi alaosassa kun tila='luonnos'
const tallennaNappiTyyli = {
  width:         '100%',
  minHeight:     '60px',
  background:    '#1e40af',     // blue-800 (vahva)
  color:         'white',
  fontSize:      '16px',
  fontWeight:    '700',
  letterSpacing: '0.06em',
  borderRadius:  '12px',
  border:        'none',
  cursor:        'pointer',
  marginTop:     '12px',
  padding:       '16px 24px',
  boxShadow:     '0 2px 8px rgba(30, 64, 175, 0.3)',
  transition:    'background 0.15s',
}

// AB-T4c: "Avaa muokattavaksi" -nappi kun tila='valmis'
const avaaNappiTyyli = {
  display:       'inline-flex',
  alignItems:    'center',
  gap:           '8px',
  padding:       '10px 18px',
  background:    'white',
  color:         '#374151',
  fontSize:      '13px',
  fontWeight:    '500',
  border:        '1px solid #d1d5db',
  borderRadius:  '8px',
  cursor:        'pointer',
  marginTop:     '12px',
}

// AB-T4c: yhteinen vahvistus-modaali (lukitus + avaus käyttää)
function Vahvistusmodaali({ otsikko, teksti, vahvistusTeksti, vahvistusVari = '#1e40af', onVahvista, onPeruuta, kaynnissa = false }) {
  return (
    <div
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0,0,0,0.5)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        zIndex:         50,
        padding:        '16px',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div style={{
        background:   'white',
        borderRadius: '16px',
        padding:      '24px',
        maxWidth:     '420px',
        width:        '100%',
        boxShadow:    '0 10px 40px rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#111827' }}>
          {otsikko}
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
          {teksti}
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onPeruuta}
            disabled={kaynnissa}
            style={{
              padding:      '8px 16px',
              background:   'transparent',
              border:       '1px solid #d1d5db',
              borderRadius: '8px',
              cursor:       kaynnissa ? 'wait' : 'pointer',
              fontSize:     '13px',
              color:        '#6b7280',
            }}
          >
            Peruuta
          </button>
          <button
            type="button"
            onClick={onVahvista}
            disabled={kaynnissa}
            style={{
              padding:      '8px 16px',
              background:   vahvistusVari,
              border:       'none',
              borderRadius: '8px',
              cursor:       kaynnissa ? 'wait' : 'pointer',
              fontSize:     '13px',
              fontWeight:   '600',
              color:        'white',
              opacity:      kaynnissa ? 0.6 : 1,
            }}
          >
            {kaynnissa ? 'Odota…' : vahvistusTeksti}
          </button>
        </div>
      </div>
    </div>
  )
}

// LomakeRenderoija voi saada rakenteen kahdella tavalla:
// 1. pohjaId — useLomakepohja-hookki lataa rakenteen + kentät tietokannasta
// 2. valmiitTiedot = { rakenne, kentat } — käytä suoraan annettuja arvoja
//    (esikatselu editorista — rakenne on tallentamaton)
//
// AB-T4b: jos hoitokayntiId annettu, vastaukset auto-tallentuu 3s viiveen
// jälkeen tallennaKayntiVastauksilla:n kautta. alkuVersio (default null)
// on optimistisen lukon lähtöarvo — null ohittaa lukon ensimmäisellä kutsulla.
//
// AB-T4c: tila-prop ('luonnos' | 'valmis') kontrolloi lukutilaa. Lukutilassa
// auto-save deaktivoidaan ja lomake näkyy disabloituna. onTilaMuutos-callback
// kutsutaan kun käyttäjä lukitsee tai avaa käynnin (parent voi refreshata
// tilan).
export default function LomakeRenderoija({
  pohjaId, valmiitTiedot, vastaukset, onMuutos, onLahetys,
  hoitokayntiId = null, alkuVersio = null,
  asiakasId = null, asiakasPituusCm = null,
  tila = 'luonnos', onTilaMuutos = null,
}) {
  // AB-T7: Memoidaan konteksti-arvo jotta provider ei rerenderöi turhaan
  // kuluttavia kenttätyyppejä (Kuvantaminen lataa raskaita TF-malleja).
  const lomakeKontekstiArvo = useMemo(
    () => ({ hoitokayntiId, asiakasId, asiakasPituusCm }),
    [hoitokayntiId, asiakasId, asiakasPituusCm]
  )
  const haetut = useLomakepohja(valmiitTiedot ? null : pohjaId)

  const rakenneRaaka = valmiitTiedot?.rakenne ?? haetut.rakenne
  // AB-T2c: normalisoi defensiivisesti — `valmiitTiedot.rakenne` voi tulla
  // esikatselusta normalisoimattomana. haeLomakepohja palauttaa jo normalisoidun,
  // joten tässä uudelleenkutsu on idempotent.
  const rakenne = useMemo(() => normalisoiPohjaRakenne(rakenneRaaka), [rakenneRaaka])
  const kentat  = valmiitTiedot?.kentat  ?? haetut.kentat
  const lataa   = !valmiitTiedot && haetut.lataa
  const virhe   = !valmiitTiedot && haetut.virhe

  const [virheet,  setVirheet]  = useState({})
  const [yritetty, setYritetty] = useState(false)
  // AB-T3a: kun hoitaja klikkaa "Aloita uusi käynti" -nappia, tila vaihtuu true:ksi.
  // Resetoidaan kun pohja vaihtuu (uusi lomake = uusi käynti).
  const [uusiKayntiAloitettu, setUusiKayntiAloitettu] = useState(false)

  // AB-T4b: auto-save -tila + viestit
  const [tallennusTila,       setTallennusTila]       = useState('idle')   // 'idle' | 'tallennetaan' | 'tallennettu' | 'virhe'
  const [viimeisinTallennus,  setViimeisinTallennus]  = useState(null)
  const [virheviesti,         setVirheviesti]         = useState(null)
  const [ristiriita,          setRistiriita]          = useState(null)

  // AB-T4c: lukitus/avaus-modaalit + niiden toimintojen tilat
  const [lukitusVahvistus,    setLukitusVahvistus]    = useState(false)
  const [avausVahvistus,      setAvausVahvistus]      = useState(false)
  const [lukitusKaynnissa,    setLukitusKaynnissa]    = useState(false)
  const [avausKaynnissa,      setAvausKaynnissa]      = useState(false)

  // AB-T4b: refit auto-save -mekanismille
  const debounceTimerRef    = useRef(null)
  const retryTimerRef       = useRef(null)
  const nykyinenVersioRef   = useRef(alkuVersio)
  const vastauksetRef       = useRef(vastaukset)
  const ekaRenderRef        = useRef(true)

  // Pidä vastauksetRef ajantasaisena — retry/debounced-tallennus käyttää sitä
  useEffect(() => {
    vastauksetRef.current = vastaukset
  }, [vastaukset])

  useEffect(() => {
    setVirheet({})
    setYritetty(false)
    setUusiKayntiAloitettu(false)
    // AB-T4b: nollaa auto-save -tila kun pohja/käynti vaihtuu
    setTallennusTila('idle')
    setViimeisinTallennus(null)
    setVirheviesti(null)
    setRistiriita(null)
    nykyinenVersioRef.current = alkuVersio
    ekaRenderRef.current = true
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null }
    if (retryTimerRef.current)    { clearTimeout(retryTimerRef.current);    retryTimerRef.current    = null }
  }, [pohjaId, valmiitTiedot, hoitokayntiId, alkuVersio])

  // AB-T4b: cleanup unmountilla — vältetään orpoja timereitä
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (retryTimerRef.current)    clearTimeout(retryTimerRef.current)
    }
  }, [])

  // AB-T4b: auto-save — 3s debounce vastaukset-muutoksesta
  // AB-T4c: tila='valmis' tilassa auto-save deaktivoidaan (lukutila)
  useEffect(() => {
    if (!hoitokayntiId) return
    if (tila === 'valmis') return            // AB-T4c: ei auto-savea lukutilassa
    if (ekaRenderRef.current) {
      // Skip ensimmäinen render: parent antaa initial vastaukset, niitä ei tallenneta
      ekaRenderRef.current = false
      return
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (retryTimerRef.current)    { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }

    debounceTimerRef.current = setTimeout(() => {
      suoritaTallennus(vastauksetRef.current)
    }, AUTO_SAVE_DEBOUNCE_MS)
    // Riippuvuudet: vain vastaukset — debounce käynnistyy joka muutoksesta.
    // suoritaTallennus on vakaa funktio joka käyttää refejä.
  }, [vastaukset, hoitokayntiId, tila]) // eslint-disable-line react-hooks/exhaustive-deps

  // AB-T4b: tallennuksen suorittaminen — kutsutaan debouncesta tai retry:stä
  async function suoritaTallennus(vastauksetSuoritushetkella) {
    if (!hoitokayntiId) return
    setTallennusTila('tallennetaan')
    setVirheviesti(null)

    const tulos = await tallennaKayntiVastauksilla(
      hoitokayntiId,
      vastauksetSuoritushetkella ?? {},
      nykyinenVersioRef.current
    )

    if (tulos.ristiriita) {
      setTallennusTila('virhe')
      setRistiriita(tulos)
      return
    }
    if (tulos.virhe) {
      setTallennusTila('virhe')
      setVirheviesti(tulos.virhe)
      // AB-T4b: schedule retry 30s päästä — käytä uusinta vastauksia
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = setTimeout(() => {
        suoritaTallennus(vastauksetRef.current)
      }, RETRY_VIIVE_MS)
      return
    }

    // Onnistui
    nykyinenVersioRef.current = tulos.versio ?? nykyinenVersioRef.current
    setTallennusTila('tallennettu')
    setViimeisinTallennus(new Date())
  }

  // AB-T3b: kun uusi käynti aloitetaan, tyhjennä muuttuvat kentät vastauksista.
  // Pysyvät kentät (kentat[tunniste].pysyva === true) säilyvät esitäytettyinä.
  // Tämä koskee kaikkia kenttiä — sekä asiakkaan että hoitajan osioissa.
  useEffect(() => {
    if (!uusiKayntiAloitettu) return
    if (!kentat) return

    onMuutos((edellinen) => {
      if (!edellinen) return edellinen
      const tulokset = {}
      for (const tunniste of Object.keys(edellinen)) {
        if (kentat[tunniste]?.pysyva) {
          tulokset[tunniste] = edellinen[tunniste]
        }
      }
      return tulokset
    })
    // Riippuvuudet: vain uusiKayntiAloitettu — tyhjennys ajetaan kun tila vaihtuu.
    // kentat-closure on edition tuore koska useEffect re-creataan render-syklissä.
  }, [uusiKayntiAloitettu]) // eslint-disable-line react-hooks/exhaustive-deps

  if (lataa) return <div style={tilaTyyli}>Ladataan lomakepohjaa…</div>
  if (virhe) return <div style={virheTyyli}>Virhe: {virhe}</div>
  if (!rakenne) return <div style={tilaTyyli}>Lomakepohjaa ei löytynyt.</div>

  const tyyliAvain = rakenne.nayttotyyli ?? 'yksi_sivu'
  const Naytto     = NAYTTOTYYLIT[tyyliAvain]

  if (!Naytto) {
    return (
      <div style={virheTyyli}>
        Näyttötyyliä &laquo;{tyyliAvain}&raquo; ei vielä tueta. Käytettävissä: {Object.keys(NAYTTOTYYLIT).join(', ')}.
      </div>
    )
  }

  function paivitaKentta(tunniste, uusiArvo) {
    if (tila === 'valmis') return            // AB-T4c: lukutilassa ei muutoksia
    // Funktionaalinen päivitys jotta stale-closurella varustetut komponentit
    // (esim. AllekirjoitusPad jonka useEffect on tallentanut callback-referenssin)
    // eivät yliaja toisten kenttien arvoja.
    onMuutos((edellinen) => ({ ...(edellinen ?? {}), [tunniste]: uusiArvo }))
    setVirheet((prev) => {
      if (!prev[tunniste]) return prev
      const { [tunniste]: _, ...loput } = prev
      return loput
    })
  }

  // AB-T4c: lukitse käynti — kutsutaan vahvistusmodaalin "Tallenna ja lukitse" -napista.
  // Auto-save:n viimeisin tallennus on jo mennyt läpi (3s debouncen päässä) — jos
  // pendingejä on, ne ehtivät joko toteutua tai ne overritettavat tämän jälkeen
  // koska seuraava lataus näkee uuden tilan/vastaukset.
  async function suoritaLukitus() {
    if (!hoitokayntiId) return
    setLukitusKaynnissa(true)

    // Jos pending debounce → suorita se synkronisesti ennen lukitusta
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
      await suoritaTallennus(vastauksetRef.current)
    }

    const tulos = await lukitseKaynti(hoitokayntiId, nykyinenVersioRef.current)
    setLukitusKaynnissa(false)
    setLukitusVahvistus(false)

    if (tulos.ristiriita) {
      setRistiriita(tulos)
      return
    }
    if (tulos.virhe) {
      setVirheviesti(tulos.virhe)
      setTallennusTila('virhe')
      return
    }

    nykyinenVersioRef.current = tulos.versio ?? nykyinenVersioRef.current
    if (onTilaMuutos) onTilaMuutos('valmis')
  }

  // AB-T4c: avaa lukittu käynti uudelleen muokattavaksi
  async function suoritaAvaus() {
    if (!hoitokayntiId) return
    setAvausKaynnissa(true)

    const tulos = await avaaKayntiUudelleen(hoitokayntiId)
    setAvausKaynnissa(false)
    setAvausVahvistus(false)

    if (tulos.virhe) {
      setVirheviesti(tulos.virhe)
      setTallennusTila('virhe')
      return
    }
    if (onTilaMuutos) onTilaMuutos('luonnos')
  }

  function lahetaLomake() {
    const uudetVirheet = validoiVastaukset(rakenne, kentat, vastaukset ?? {})
    setVirheet(uudetVirheet)
    setYritetty(true)
    if (Object.keys(uudetVirheet).length === 0 && onLahetys) {
      onLahetys(vastaukset ?? {})
    }
  }

  const virheidenMaara = Object.keys(virheet).length

  return (
    <LomakeKontekstiProvider value={lomakeKontekstiArvo}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* AB-T4c: lukutila-lippu yläosaan kun käynti on tallennettu valmiina */}
      {tila === 'valmis' && (
        <div style={lukutilaLippuTyyli} role="status">
          <span style={{ fontSize: '16px' }}>✓</span>
          <span>
            Käynti tallennettu (lukittu)
            {viimeisinTallennus && ` · klo ${muotoileKlo(viimeisinTallennus)}`}
          </span>
        </div>
      )}

      {/* AB-T4b: tallennustila-indikaattori (näytetään kun hoitokayntiId asetettu, ei lukutilassa) */}
      {hoitokayntiId && tila !== 'valmis' && tallennusTila !== 'idle' && (
        <div style={tallennusIndikatorTyyli(tallennusTila)} role="status" aria-live="polite">
          {tallennusTila === 'tallennetaan' && <span>💾 Tallennetaan…</span>}
          {tallennusTila === 'tallennettu' && (
            <span>✓ Tallennettu klo {muotoileKlo(viimeisinTallennus)}</span>
          )}
          {tallennusTila === 'virhe' && (
            <>
              <span>⚠ Tallennus epäonnistui — yritetään uudelleen 30 s päästä</span>
              <button
                type="button"
                onClick={() => suoritaTallennus(vastauksetRef.current)}
                style={{
                  marginLeft:   'auto',
                  fontSize:     '11px',
                  padding:      '3px 10px',
                  background:   '#fff',
                  border:       '1px solid #fecaca',
                  borderRadius: '6px',
                  cursor:       'pointer',
                  color:        '#991b1b',
                  fontWeight:   '500',
                }}
              >
                Yritä nyt
              </button>
            </>
          )}
        </div>
      )}

      {yritetty && virheidenMaara > 0 && (
        <div style={yhteenvetoTyyli}>
          Lomakkeessa on {virheidenMaara} {virheidenMaara === 1 ? 'puute' : 'puutetta'}.
          Punaisella merkityt pakolliset kentät ovat tyhjiä.
        </div>
      )}

      {/* AB-T4c: lukutilassa Naytto on disabloitu — pointer-events:none + opacity */}
      <div
        style={{
          pointerEvents: tila === 'valmis' ? 'none' : 'auto',
          opacity:       tila === 'valmis' ? 0.7   : 1,
          transition:    'opacity 0.15s',
        }}
        aria-disabled={tila === 'valmis'}
      >
        <Naytto
          rakenne={rakenne}
          kentat={kentat}
          vastaukset={vastaukset ?? {}}
          virheet={virheet}
          onKenttamuutos={paivitaKentta}
          onLahetys={onLahetys ? lahetaLomake : null}
          uusiKayntiAloitettu={uusiKayntiAloitettu}
          onAloitaUusiKaynti={() => setUusiKayntiAloitettu(true)}
        />
      </div>

      {/* AB-T4c: "Tallenna käynti" -nappi alaosassa kun tila='luonnos' ja hoitokayntiId set */}
      {hoitokayntiId && tila === 'luonnos' && (
        <button
          type="button"
          onClick={() => setLukitusVahvistus(true)}
          style={tallennaNappiTyyli}
        >
          💾 Tallenna käynti
        </button>
      )}

      {/* AB-T4c: "Avaa muokattavaksi" -nappi kun tila='valmis' */}
      {hoitokayntiId && tila === 'valmis' && (
        <button
          type="button"
          onClick={() => setAvausVahvistus(true)}
          style={avaaNappiTyyli}
        >
          🔓 Avaa muokattavaksi
        </button>
      )}

      {/* AB-T4c: lukitus-vahvistusmodaali */}
      {lukitusVahvistus && (
        <Vahvistusmodaali
          otsikko="Tallenna ja lukitse käynti"
          teksti="Käynnin tallentamisen jälkeen lomake lukitaan. Voit avata sen uudelleen muokattavaksi tarvittaessa, mutta jokainen avaus tallentuu lokijälkeen."
          vahvistusTeksti="Tallenna ja lukitse"
          vahvistusVari="#1e40af"
          onVahvista={suoritaLukitus}
          onPeruuta={() => setLukitusVahvistus(false)}
          kaynnissa={lukitusKaynnissa}
        />
      )}

      {/* AB-T4c: avaa-vahvistusmodaali */}
      {avausVahvistus && (
        <Vahvistusmodaali
          otsikko="Avaa käynti uudelleen muokattavaksi"
          teksti="Tämä käynti on tallennettu valmiina. Avataanko uudelleen muokattavaksi? Toiminnasta jää lokijälki (aikaleima + hoitajan tunnus)."
          vahvistusTeksti="Avaa muokattavaksi"
          vahvistusVari="#dc2626"
          onVahvista={suoritaAvaus}
          onPeruuta={() => setAvausVahvistus(false)}
          kaynnissa={avausKaynnissa}
        />
      )}

      {/* AB-T4b: ristiriita-modaali — käynti muokattu toisessa ikkunassa */}
      {ristiriita && (
        <div style={ristiriitaTaustaTyyli} role="dialog" aria-modal="true">
          <div style={ristiriitaSisaltoTyyli}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#991b1b' }}>
              ⚠ Käynti muokattu toisessa ikkunassa
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
              Tämä käynti on tallennettu toisessa ikkunassa tai välilehdessä. Päivitä sivu nähdäksesi
              uusin tila — muutoin nykyiset muutoksesi voivat hävitä.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRistiriita(null)}
                style={{
                  padding:      '8px 16px',
                  background:   'transparent',
                  border:       '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor:       'pointer',
                  fontSize:     '13px',
                  color:        '#6b7280',
                }}
              >
                Sulje
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding:      '8px 16px',
                  background:   '#dc2626',
                  border:       'none',
                  borderRadius: '8px',
                  cursor:       'pointer',
                  fontSize:     '13px',
                  fontWeight:   '600',
                  color:        'white',
                }}
              >
                Päivitä sivu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </LomakeKontekstiProvider>
  )
}
