import { useState, useEffect, useMemo, useRef } from 'react'
import { useLomakepohja } from '../../../hooks/useLomakepohja'
import { validoiVastaukset } from '../../../lib/lomakeValidointi'
import { normalisoiPohjaRakenne, tallennaKayntiVastauksilla } from '../../../lib/db'
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

// LomakeRenderoija voi saada rakenteen kahdella tavalla:
// 1. pohjaId — useLomakepohja-hookki lataa rakenteen + kentät tietokannasta
// 2. valmiitTiedot = { rakenne, kentat } — käytä suoraan annettuja arvoja
//    (esikatselu editorista — rakenne on tallentamaton)
//
// AB-T4b: jos hoitokayntiId annettu, vastaukset auto-tallentuu 3s viiveen
// jälkeen tallennaKayntiVastauksilla:n kautta. alkuVersio (default null)
// on optimistisen lukon lähtöarvo — null ohittaa lukon ensimmäisellä kutsulla.
export default function LomakeRenderoija({
  pohjaId, valmiitTiedot, vastaukset, onMuutos, onLahetys,
  hoitokayntiId = null, alkuVersio = null,
}) {
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
  useEffect(() => {
    if (!hoitokayntiId) return
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
  }, [vastaukset, hoitokayntiId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* AB-T4b: tallennustila-indikaattori (näytetään kun hoitokayntiId asetettu) */}
      {hoitokayntiId && tallennusTila !== 'idle' && (
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
  )
}
