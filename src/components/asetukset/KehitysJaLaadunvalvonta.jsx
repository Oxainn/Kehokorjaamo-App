// "Kehitys ja laadunvalvonta" -dashboard.
//
// Yhden silmäyksen näkymä admin-käyttäjälle Kehitys-puolella:
//   OSA 1 — Ympäristöt + Tarkistuskierros (2 saraketta)
//   OSA 2 — TODO + Ehdotukset (2 saraketta)
//   OSA 3 — Changelog + Visio (2 saraketta)
//   OSA 4 — Kehitysaktiivisuus 30 pv (täysleveys)
//
// Tausta: korvaa aiempi accordion-pohjainen rakenne. Kaikki lohkot
// ovat aina avoinna ("flat dashboard"). PC ensisijainen, alle 1024px
// sarakkeet menevät päällekkäin.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { supabase } from '../../services/supabase'
import { YMPARISTOT, haeViimeisinCommit, haeErotHaarat, pingaaUrl, GITHUB_REPO } from '../../lib/ymparistot'
import { tunnistaYmparisto, YMPARISTO } from '../../lib/ymparisto'
import SiirraLiveenModaali from './SiirraLiveenModaali'
import RollbackModaali from './RollbackModaali'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGrid = WidthProvider(Responsive)

// localStorage-avain mukautetulle layoutille (v3: nollaa vanhat layoutit
// jotta DD1-DD6:n minW/minH-rajoitteet eivät rikkoudu)
const LAYOUT_KEY = 'kehokorjaamo_dev_dashboard_layout_v3'
const SUPABASE_TALLENNUS_VIIVE_MS = 2000
const LOCAL_TALLENNUS_VIIVE_MS    = 500

// Lohkojen ID-listat ja default-layout (12-sarakkeinen ruudukko, rowHeight=50)
const LOHKOT = [
  { id: 'ymparistot',   nimi: 'Ympäristöt',          ikoni: '🌐' },
  { id: 'tarkistus',    nimi: 'Tarkistuskierros',    ikoni: '🔍' },
  { id: 'todo',         nimi: 'Välttämättömät tehtävät', ikoni: '📋' },
  { id: 'ehdotukset',   nimi: 'Koodaajan ehdotukset', ikoni: '💡' },
  { id: 'changelog',    nimi: 'Changelog',           ikoni: '📝' },
  { id: 'visio',        nimi: 'Visio ja periaatteet', ikoni: '🎯' },
  { id: 'aktiivisuus',  nimi: 'Kehitysaktiivisuus',  ikoni: '📈' },
]

// Default-asetelma DD1-spec:n mukaan: 12-sarakkeinen, rowHeight=50px,
// minW/minH varmistavat että teksti edes mahtuu pienessäkin lohkossa.
const DEFAULT_LG = [
  { i: 'ymparistot',  x: 0, y: 0,  w: 6, h: 8, minW: 4, minH: 5 },
  { i: 'tarkistus',   x: 6, y: 0,  w: 6, h: 6, minW: 4, minH: 4 },
  { i: 'todo',        x: 0, y: 8,  w: 6, h: 7, minW: 4, minH: 4 },
  { i: 'ehdotukset',  x: 6, y: 6,  w: 6, h: 6, minW: 4, minH: 4 },
  { i: 'changelog',   x: 0, y: 15, w: 6, h: 5, minW: 4, minH: 3 },
  { i: 'visio',       x: 6, y: 12, w: 6, h: 6, minW: 4, minH: 3 },
  { i: 'aktiivisuus', x: 0, y: 20, w: 12, h: 4, minW: 6, minH: 3 },
]
const DEFAULT_MD = DEFAULT_LG.map((l) => ({ ...l, w: Math.min(l.w, 10), x: l.x % 10 }))
const DEFAULT_SM = DEFAULT_LG.map((l, i) => ({ ...l, w: 6, x: 0, y: i * 6 }))
const DEFAULT_XS = DEFAULT_LG.map((l, i) => ({ ...l, w: 4, x: 0, y: i * 6, minW: 3 }))
const DEFAULT_XXS = DEFAULT_LG.map((l, i) => ({ ...l, w: 2, x: 0, y: i * 6, minW: 2 }))

const oletusLayout = () => ({
  layouts: {
    lg: DEFAULT_LG,
    md: DEFAULT_MD,
    sm: DEFAULT_SM,
    xs: DEFAULT_XS,
    xxs: DEFAULT_XXS,
  },
  piilotetut: [],
  paivitetty: new Date().toISOString(),
})

const lataaLocalLayout = () => {
  try {
    const tallennettu = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? 'null')
    if (tallennettu?.layouts && Array.isArray(tallennettu.piilotetut)) {
      // Vanha tallennus ilman paivitetty-leimaa → täydennä
      if (!tallennettu.paivitetty) tallennettu.paivitetty = new Date(0).toISOString()
      return tallennettu
    }
  } catch { /* korruptoitunut localStorage — fallback default */ }
  return oletusLayout()
}

// Tallennettava data leimataan aina nykyhetkellä jotta pilvi-vertailu
// (last-write-wins) toimii.
const tallennaLocalLayout = (data) => {
  try {
    const leimallinen = { ...data, paivitetty: new Date().toISOString() }
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(leimallinen))
  } catch { /* tilaa ei riittänyt */ }
}

const POLLAUS_VALI_MS = 30_000
const muotoilePvm = (iso) => iso ? new Date(iso).toLocaleString('fi-FI', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const muotoilePvmLyhyt = (iso) => iso ? new Date(iso).toLocaleDateString('fi-FI') : '—'
const lyhytSha = (sha) => sha?.slice(0, 7) ?? ''

const sittenTeksti = (iso) => {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'juuri nyt'
  if (min < 60) return `${min} min sitten`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h sitten`
  const d = Math.floor(h / 24)
  return `${d} pv sitten`
}

const PRIORITEETTI_VARIT = {
  korkea: { vari: '#ef4444', tausta: '#fef2f2', nimi: 'Korkea' },
  keski:  { vari: '#eab308', tausta: '#fefce8', nimi: 'Keski' },
  matala: { vari: '#22c55e', tausta: '#f0fdf4', nimi: 'Matala' },
}

const VAIKUTUS_VARIT = {
  vaikuttaa_useaan: { vari: '#dc2626', nimi: 'Vaikuttaa useaan paikkaan' },
  arkkitehtuuri:    { vari: '#7c3aed', nimi: 'Arkkitehtuurin osa' },
  paikallinen:      { vari: '#16a34a', nimi: 'Paikallinen' },
  oletus:           { vari: '#9ca3af', nimi: '—' },
}

// Korttipohja-tyyli — käytössä lähes joka osiossa
const korttiTyyli = {
  background:    'white',
  border:        '1px solid #e5e7eb',
  borderRadius:  '12px',
  padding:       '16px 18px',
  display:       'flex',
  flexDirection: 'column',
  gap:           '12px',
  boxShadow:     '0 1px 2px rgba(0,0,0,0.04)',
}

const korttiOtsikkoTyyli = {
  fontSize:   '14px',
  fontWeight: 700,
  color:      '#111827',
  margin:     0,
  display:    'flex',
  alignItems: 'center',
  gap:        '8px',
}

const numeroPalluraTyyli = (vari = '#9ca3af') => ({
  display:        'inline-flex',
  alignItems:     'center',
  justifyContent: 'center',
  minWidth:       '20px',
  height:         '20px',
  padding:        '0 6px',
  borderRadius:   '10px',
  background:     vari,
  color:          'white',
  fontSize:       '11px',
  fontWeight:     700,
})

// ─────────────────────────────────────────────────────────────────────────
// PÄÄKOMPONENTTI
// ─────────────────────────────────────────────────────────────────────────

export default function KehitysJaLaadunvalvonta({ hoitajaId }) {
  const [pb, setPb] = useState(null)
  const [virhe, setVirhe] = useState(null)
  // Layout-tila + piilotetut lohkot. Lataa ensin localStoragesta (nopea),
  // sitten Supabasesta taustalla — jos eroavat, kysy käyttäjältä.
  const [{ layouts, piilotetut }, setLayoutTila] = useState(() => lataaLocalLayout())
  const [resetVahvistusAuki, setResetVahvistusAuki] = useState(false)
  const localTallennusRef    = useRef(null)
  const supabaseTallennusRef = useRef(null)

  const lataaPb = useCallback(async () => {
    if (!hoitajaId) return
    const { data, error } = await supabase
      .from('productboard')
      .select('visio, ideat, todo, changelog')
      .eq('hoitaja_id', hoitajaId)
      .maybeSingle()
    if (error) { setVirhe(error.message); return }
    // Defensiivinen normalisointi: vanhoilla todo-riveillä ei välttämättä ole
    // status-kenttää (legacy-data ennen status-flow:ta). Ilman status-kenttää
    // merkitseValmiiksi-toiminto tuntuu hiljaiselta käyttäjälle koska "valmis"-
    // suodatin (status === 'done') on jo aina true:lle ennen klikkausta. Aseta
    // puuttuvat kentät että toiminnot toimivat luotettavasti.
    const normalisoiTodo = (t, i) => ({
      id:           t.id ?? `todo-legacy-${i}`,
      teksti:       t.teksti ?? '',
      kuvaus:       t.kuvaus ?? '',
      status:       t.status ?? 'todo',
      prioriteetti: t.prioriteetti ?? 'keski',
      vaikutus:     t.vaikutus ?? 'paikallinen',
      lisätty:      t.lisätty ?? new Date().toISOString(),
      ...(t.valmistunut ? { valmistunut: t.valmistunut } : {}),
    })
    setPb({
      visio:     data?.visio ?? '',
      ideat:     data?.ideat ?? [],
      todo:      (data?.todo ?? []).map(normalisoiTodo),
      changelog: data?.changelog ?? [],
    })
  }, [hoitajaId])

  useEffect(() => { lataaPb() }, [lataaPb])

  // Debounced-tallennus muutoksiin
  const tallennusRef = useRef(null)
  const tallennaPb = useCallback(async (uusi) => {
    if (!hoitajaId) return
    const { error } = await supabase
      .from('productboard')
      .upsert({
        hoitaja_id: hoitajaId,
        visio:      uusi.visio,
        ideat:      uusi.ideat,
        todo:       uusi.todo,
        changelog:  uusi.changelog,
      }, { onConflict: 'hoitaja_id' })
    if (error) setVirhe(error.message)
  }, [hoitajaId])

  // Päivittää pb:n + tallentaa Supabaseen heti (tärkeät toiminnot, esim. siirto)
  const pbHetiTallennus = useCallback((paivitin) => {
    setPb((nykyinen) => {
      if (!nykyinen) return nykyinen
      const uusi = paivitin(nykyinen)
      // tallenna heti, ei debounce
      tallennaPb(uusi)
      return uusi
    })
  }, [tallennaPb])

  // Päivittää pb:n + debounced-tallennus (visio-tekstikenttä yms.)
  const pbDebouncedTallennus = useCallback((paivitin) => {
    setPb((nykyinen) => {
      if (!nykyinen) return nykyinen
      const uusi = paivitin(nykyinen)
      clearTimeout(tallennusRef.current)
      tallennusRef.current = setTimeout(() => tallennaPb(uusi), 1500)
      return uusi
    })
  }, [tallennaPb])

  // Tallennus debounced: localStorage 500ms, Supabase 2s. Molemmat
  // peruuntuvat seuraavalla kutsulla kunnes käyttäjä lakkaa muokkaamasta.
  const tallennaPilveen = useCallback(async (data) => {
    if (!hoitajaId) return
    await supabase
      .from('user_preferences')
      .upsert({ user_id: hoitajaId, dev_dashboard_layout: data, paivitetty: new Date().toISOString() }, { onConflict: 'user_id' })
  }, [hoitajaId])

  const ajastaTallennus = useCallback((data) => {
    clearTimeout(localTallennusRef.current)
    localTallennusRef.current = setTimeout(() => tallennaLocalLayout(data), LOCAL_TALLENNUS_VIIVE_MS)
    clearTimeout(supabaseTallennusRef.current)
    supabaseTallennusRef.current = setTimeout(() => tallennaPilveen(data), SUPABASE_TALLENNUS_VIIVE_MS)
  }, [tallennaPilveen])

  // DD5 (yksinkertaistettu — last-write-wins): lataa pilvi-versio mountissa,
  // vertaa updated_at-aikaleimaa locallin tallennukseen ja päivitä hiljaa
  // jos pilvi on uudempi. Ei modaalia, ei käyttäjäkysymystä — eri välilehdet
  // / ajoitusongelmat eivät enää häiritse.
  useEffect(() => {
    if (!hoitajaId) return
    let peruttu = false
    ;(async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('dev_dashboard_layout, paivitetty')
        .eq('user_id', hoitajaId)
        .maybeSingle()
      if (peruttu || !data?.dev_dashboard_layout) return
      const local = lataaLocalLayout()
      const pilviAika = new Date(data.paivitetty ?? 0).getTime()
      const localAika = new Date(local.paivitetty ?? 0).getTime()
      // Jos pilvi on aidosti uudempi → päivitä paikallinen + näkymä
      if (pilviAika > localAika) {
        const pilvi = {
          ...data.dev_dashboard_layout,
          paivitetty: data.paivitetty,
        }
        setLayoutTila(pilvi)
        // Tallenna localStorageen ilman uutta aikaleimaa (säilytetään pilvi-leima)
        try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(pilvi)) } catch { /* sivuvaikutus ei kriittinen */ }
      }
    })()
    return () => { peruttu = true }
  }, [hoitajaId])

  const onLayoutChange = useCallback((_currentLayout, allLayouts) => {
    setLayoutTila((prev) => {
      const uusi = { ...prev, layouts: allLayouts }
      ajastaTallennus(uusi)
      return uusi
    })
  }, [ajastaTallennus])

  const piilota = useCallback((id) => {
    setLayoutTila((prev) => {
      const uusi = { ...prev, piilotetut: [...prev.piilotetut.filter((p) => p !== id), id] }
      ajastaTallennus(uusi)
      return uusi
    })
  }, [ajastaTallennus])

  const palauta = useCallback((id) => {
    setLayoutTila((prev) => {
      const uusi = { ...prev, piilotetut: prev.piilotetut.filter((p) => p !== id) }
      ajastaTallennus(uusi)
      return uusi
    })
  }, [ajastaTallennus])

  const palautaOletus = useCallback(() => setResetVahvistusAuki(true), [])

  const vahvistaPalautus = useCallback(() => {
    const oletus = oletusLayout()
    setLayoutTila(oletus)
    tallennaLocalLayout(oletus)
    tallennaPilveen(oletus)
    setResetVahvistusAuki(false)
  }, [tallennaPilveen])

  // Suodata pois piilotetut lohkot näkyvästä layoutista. useMemo pitää olla
  // ennen aikaista returnia jotta hookkien järjestys pysyy stabiilina.
  const naytettavatLayouts = useMemo(() => {
    const piiloSet = new Set(piilotetut)
    const suodata = (lst) => (lst ?? []).filter((l) => !piiloSet.has(l.i))
    return {
      lg: suodata(layouts.lg),
      md: suodata(layouts.md),
      sm: suodata(layouts.sm),
    }
  }, [layouts, piilotetut])

  if (!pb) {
    return (
      <div style={{ padding: '24px', color: '#6b7280', fontSize: '14px' }}>
        Ladataan dashboardia…
        {virhe && <div style={{ color: '#dc2626', marginTop: '8px' }}>Virhe: {virhe}</div>}
      </div>
    )
  }

  const lohkoMap = {
    ymparistot:  <YmparistotPaneeli />,
    tarkistus:   <TarkistusPaneeli kayttajaId={hoitajaId} />,
    todo:        <TodoPaneeli pb={pb} pbHetiTallennus={pbHetiTallennus} />,
    ehdotukset:  <EhdotuksetPaneeli pb={pb} pbHetiTallennus={pbHetiTallennus} />,
    changelog:   <ChangelogPaneeli pb={pb} />,
    visio:       <VisioPaneeli pb={pb} pbDebouncedTallennus={pbDebouncedTallennus} />,
    aktiivisuus: <AktiivisuusPaneeli />,
  }

  const naytettavat = LOHKOT.filter((l) => !piilotetut.includes(l.id))

  return (
    <div style={{ width: '100%' }}>
      {/* DD6 — visuaalinen palaute drag/resize:lle */}
      <style>{`
        .react-grid-item {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease !important;
        }
        .react-grid-item:hover .rgl-drag-handle span:first-child {
          color: #1D9E75;
        }
        .react-grid-item.react-draggable-dragging {
          z-index: 10;
          box-shadow: 0 12px 24px rgba(59, 130, 246, 0.25) !important;
          opacity: 0.95;
        }
        .react-grid-item.react-draggable-dragging > div {
          border-color: #93c5fd !important;
        }
        .react-grid-item.resizing {
          opacity: 0.85;
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.2) !important;
        }
        .react-grid-placeholder {
          background: #93c5fd !important;
          opacity: 0.4 !important;
          border-radius: 12px !important;
        }
        .react-resizable-handle {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .react-grid-item:hover .react-resizable-handle {
          opacity: 1;
        }
      `}</style>
      {/* Yläpalkki: piilotetut + reset */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            '12px',
        marginBottom:   '12px',
        flexWrap:       'wrap',
        fontSize:       '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: '#6b7280' }}>
          {piilotetut.length > 0 ? (
            <>
              <span>Piilotetut:</span>
              {piilotetut.map((id) => {
                const l = LOHKOT.find((x) => x.id === id)
                if (!l) return null
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => palauta(id)}
                    title={`Palauta ${l.nimi}`}
                    style={{
                      padding:      '3px 10px',
                      borderRadius: '999px',
                      border:       '1px dashed #d1d5db',
                      background:   '#f9fafb',
                      color:        '#6b7280',
                      fontSize:     '11px',
                      cursor:       'pointer',
                    }}
                  >
                    {l.ikoni} {l.nimi}
                  </button>
                )
              })}
            </>
          ) : (
            <span style={{ fontStyle: 'italic' }}>Vedä otsikkorivistä siirtääksesi lohkoa · vedä reunasta muuttaaksesi kokoa</span>
          )}
        </div>
        <button
          type="button"
          onClick={palautaOletus}
          style={{
            padding:      '4px 12px',
            borderRadius: '6px',
            border:       '1px solid #e5e7eb',
            background:   'white',
            color:        '#6b7280',
            fontSize:     '11px',
            cursor:       'pointer',
          }}
        >
          ↺ Palauta oletusasetukset
        </button>
      </div>

      <ResponsiveGrid
        layouts={naytettavatLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={50}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        draggableHandle=".rgl-drag-handle"
        onLayoutChange={onLayoutChange}
        compactType="vertical"
        preventCollision={false}
        isDraggable
        isResizable
      >
        {naytettavat.map((l) => (
          <div key={l.id} style={{ background: 'transparent' }}>
            <Lohko nimi={l.nimi} ikoni={l.ikoni} onPiilota={() => piilota(l.id)}>
              {lohkoMap[l.id]}
            </Lohko>
          </div>
        ))}
      </ResponsiveGrid>

      {/* DD6 — vahvistusmodaali resetille (oma sovellus-modaali confirm():n sijaan) */}
      {resetVahvistusAuki && (
        <Modaali otsikko="Palautetaanko oletuslayout?" onSulje={() => setResetVahvistusAuki(false)} maxWidth="440px">
          <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
            Kaikki lohkojen sijainnit, koot ja piilotukset palautetaan
            alkuperäisiin oletusarvoihin. Toiminto tallentuu myös pilveen.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" onClick={() => setResetVahvistusAuki(false)} style={napinTyyli('beige')}>Peru</button>
            <button type="button" onClick={vahvistaPalautus} style={napinTyyli('vihrea')}>↻ Palauta oletus</button>
          </div>
        </Modaali>
      )}

    </div>
  )
}

// Lohko-kääre: drag-handle + piilota-nappi + sisältö (skrollattava jos
// pitkempi kuin lohkon korkeus)
function Lohko({ nimi, ikoni, onPiilota, children }) {
  return (
    <div style={{
      ...korttiTyyli,
      height:   '100%',
      padding:  '0',
      gap:      '0',
      overflow: 'hidden',
    }}>
      <div className="rgl-drag-handle" style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '8px 14px',
        borderBottom:   '1px solid #f3f4f6',
        cursor:         'grab',
        userSelect:     'none',
        background:     '#fafafa',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#9ca3af', cursor: 'grab' }}>⋮⋮</span>
          <span>{ikoni}</span>
          <span>{nimi}</span>
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPiilota() }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Piilota lohko"
          style={{
            background:    'transparent',
            border:        'none',
            cursor:        'pointer',
            color:         '#9ca3af',
            fontSize:      '14px',
            padding:       '4px 6px',
            borderRadius:  '4px',
          }}
        >
          👁
        </button>
      </div>
      <div style={{
        flex:     '1 1 auto',
        padding:  '12px 14px',
        overflow: 'auto',
      }}>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// OSA 1A — Ympäristöt + Siirrä Liveen
// ─────────────────────────────────────────────────────────────────────────

function YmparistotPaneeli() {
  const omaYmparisto = tunnistaYmparisto()
  const [pingLive,    setPingLive]    = useState(null)
  const [pingKehitys, setPingKehitys] = useState(null)
  const [liveCommit,  setLiveCommit]  = useState(null)
  const [kehCommit,   setKehCommit]   = useState(null)
  const [erot,        setErot]        = useState([])
  const [siirraAuki,  setSiirraAuki]  = useState(false)
  const [rollbackAuki, setRollbackAuki] = useState(false)

  const lataa = useCallback(async () => {
    const tulokset = await Promise.allSettled([
      haeViimeisinCommit('main'),
      haeViimeisinCommit('kehitys'),
      haeErotHaarat('main', 'kehitys'),
    ])
    if (tulokset[0].status === 'fulfilled') setLiveCommit(tulokset[0].value)
    if (tulokset[1].status === 'fulfilled') setKehCommit(tulokset[1].value)
    if (tulokset[2].status === 'fulfilled') setErot(tulokset[2].value)
  }, [])

  useEffect(() => { lataa() }, [lataa])

  useEffect(() => {
    let peruttu = false
    async function pingaa() {
      const [l, k] = await Promise.all([pingaaUrl(YMPARISTOT.live.url), pingaaUrl(YMPARISTOT.kehitys.url)])
      if (peruttu) return
      setPingLive(l.ok ? 'ok' : 'virhe')
      setPingKehitys(k.ok ? 'ok' : 'virhe')
    }
    pingaa()
    const i = setInterval(pingaa, POLLAUS_VALI_MS)
    return () => { peruttu = true; clearInterval(i) }
  }, [])

  return (
    <div style={korttiTyyli}>
      <h3 style={korttiOtsikkoTyyli}>🌐 Ympäristöt</h3>

      <YmparistoRivi
        nimi="LIVE"
        url={YMPARISTOT.live.url}
        vari="#16a34a"
        pingTila={pingLive}
        commit={liveCommit}
      />
      <YmparistoRivi
        nimi="KEHITYS"
        url={YMPARISTOT.kehitys.url}
        vari="#f59e0b"
        pingTila={pingKehitys}
        commit={kehCommit}
        merkkiOma={omaYmparisto === YMPARISTO.KEHITYS}
      />

      {/* Erot-laatikko */}
      <div style={{
        background:   '#fef3c7',
        border:       '1px solid #fcd34d',
        borderRadius: '10px',
        padding:      '12px 14px',
        display:      'flex',
        flexDirection: 'column',
        gap:          '10px',
      }}>
        <div style={{ fontSize: '13px', color: '#78350f', fontWeight: 600 }}>
          {erot.length === 0
            ? '✓ Live ja Kehitys ovat samalla commitilla'
            : `${erot.length} commit${erot.length === 1 ? '' : 'tia'} odottaa Liveen julkaisua`}
        </div>
        {erot.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {erot.slice(-3).reverse().map((c) => (
              <li key={c.sha} style={{ fontSize: '11px', display: 'grid', gridTemplateColumns: '60px 1fr', gap: '6px' }}>
                <code style={{ color: '#9ca3af', fontFamily: 'monospace' }}>{lyhytSha(c.sha)}</code>
                <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.viesti}>
                  {c.viesti}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSiirraAuki(true)}
            disabled={erot.length === 0 || omaYmparisto !== YMPARISTO.KEHITYS}
            style={{
              flex:         '1 1 auto',
              padding:      '10px 16px',
              minHeight:    '40px',
              borderRadius: '10px',
              border:       'none',
              background:   erot.length > 0 && omaYmparisto === YMPARISTO.KEHITYS ? '#16a34a' : '#9ca3af',
              color:        'white',
              fontSize:     '13px',
              fontWeight:   700,
              cursor:       erot.length > 0 && omaYmparisto === YMPARISTO.KEHITYS ? 'pointer' : 'not-allowed',
              opacity:      erot.length > 0 && omaYmparisto === YMPARISTO.KEHITYS ? 1 : 0.6,
            }}
          >
            🚀 Siirrä Liveen ({erot.length})
          </button>
          <button
            type="button"
            onClick={() => setRollbackAuki(true)}
            disabled={omaYmparisto !== YMPARISTO.KEHITYS}
            title={omaYmparisto !== YMPARISTO.KEHITYS ? 'Toimii vain Kehitys-puolelta' : 'Rollback Live-deploy'}
            style={{
              padding:      '10px 14px',
              minHeight:    '40px',
              borderRadius: '10px',
              border:       '1px solid #fecaca',
              background:   omaYmparisto === YMPARISTO.KEHITYS ? '#fef2f2' : '#f3f4f6',
              color:        omaYmparisto === YMPARISTO.KEHITYS ? '#991b1b' : '#9ca3af',
              fontSize:     '12px',
              fontWeight:   600,
              cursor:       omaYmparisto === YMPARISTO.KEHITYS ? 'pointer' : 'not-allowed',
            }}
          >
            ↩ Rollback
          </button>
        </div>
      </div>
      <a
        href={`https://github.com/${GITHUB_REPO}/compare/main...kehitys`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: '11px', color: '#6b7280', textDecoration: 'none', alignSelf: 'flex-start' }}
      >
        Avaa GitHub-vertailu ↗
      </a>

      {siirraAuki && (
        <SiirraLiveenModaali
          erot={erot}
          onSulje={() => setSiirraAuki(false)}
          onValmis={() => { setSiirraAuki(false); setTimeout(() => lataa(), 2500) }}
        />
      )}
      {rollbackAuki && (
        <RollbackModaali
          onSulje={() => setRollbackAuki(false)}
          onValmis={() => setRollbackAuki(false)}
        />
      )}
    </div>
  )
}

function YmparistoRivi({ nimi, url, vari, pingTila, commit, merkkiOma }) {
  const palloVari = pingTila === 'ok' ? vari : pingTila === 'virhe' ? '#ef4444' : '#9ca3af'
  return (
    <div style={{
      display:    'grid',
      gridTemplateColumns: '14px 1fr auto',
      gap:        '10px',
      alignItems: 'center',
      fontSize:   '13px',
    }}>
      <span style={{
        width:        '10px',
        height:       '10px',
        borderRadius: '50%',
        background:   palloVari,
        animation:    pingTila === 'ok' ? 'sykePulssi 2s ease-in-out infinite' : 'none',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: vari, fontWeight: 700, textDecoration: 'none' }}>
            {nimi}
          </a>
          {merkkiOma && (
            <span style={{ fontSize: '10px', padding: '1px 5px', background: '#f3f4f6', color: '#6b7280', borderRadius: '4px' }}>
              olet täällä
            </span>
          )}
          {commit && (
            <code style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>{lyhytSha(commit.sha)}</code>
          )}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
          {commit ? `${commit.viesti.slice(0, 60)} · ${sittenTeksti(commit.pvm)}` : 'Ladataan…'}
        </div>
      </div>
      <span style={{ fontSize: '11px', color: pingTila === 'virhe' ? '#dc2626' : '#9ca3af' }}>
        {pingTila === 'ok' ? '✓ vastaa' : pingTila === 'virhe' ? '✗ ei vastaa' : '…'}
      </span>
      <style>{`@keyframes sykePulssi {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.5; transform: scale(1.2); }
      }`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// OSA 1B — Tarkistuskierros (laadunvalvonta-silmukka kompaktissa)
// ─────────────────────────────────────────────────────────────────────────

const TARKISTUS_PROMPT_RUNKO = `TEHTÄVÄ: Kokonaisvaltainen tarkistuskierros (laadunvalvonta-silmukka)

Käy ohjelma järjestelmällisesti läpi:
- Perustoiminnot, reunatapaukset, bugit, tietoturva, käyttökokemus,
  koodin laatu, parannukset.
- Korjaa selkeät bugit suoraan committilla.
- Lisää välttämättömät TODO:lle (status: 'todo').
- Lisää parannusehdotukset Koodaajan ideat -listalle.
- Raportoi yhteenveto: korjattu / TODO / ideoita.

KESKITY: [TÄYTÄ ALUE TÄHÄN, esim. "Vaihe B Pala B6.6" tai "kaikki"].`

function TarkistusPaneeli({ kayttajaId }) {
  const [kierrokset, setKierrokset] = useState([])
  const [modaaliAuki, setModaaliAuki] = useState(false)
  const [logiAuki,    setLogiAuki]    = useState(false)
  const [prompt,      setPrompt]      = useState(TARKISTUS_PROMPT_RUNKO)
  const [tila,        setTila]        = useState('idle')
  const [virhe,       setVirhe]       = useState(null)
  const [kopioitu,    setKopioitu]    = useState(false)

  const lataa = useCallback(async () => {
    if (!kayttajaId) return
    const { data, error } = await supabase
      .from('tarkistuskierrokset')
      .select('id, prompt, status, yhteenveto, todo_lisatty, ideat_lisatty, luotu, valmistunut')
      .order('luotu', { ascending: false })
      .limit(20)
    if (!error) setKierrokset(data ?? [])
  }, [kayttajaId])

  useEffect(() => { lataa() }, [lataa])

  const edellinen = kierrokset[0] ?? null

  async function tallennaJaSulje() {
    if (!kayttajaId) return
    setTila('tallentaa')
    setVirhe(null)
    const { error } = await supabase
      .from('tarkistuskierrokset')
      .insert({ pyytaja_id: kayttajaId, prompt, status: 'pyydetty' })
    if (error) { setVirhe(error.message); setTila('virhe'); return }
    setTila('onnistui')
    await lataa()
    setTimeout(() => { setModaaliAuki(false); setTila('idle'); setPrompt(TARKISTUS_PROMPT_RUNKO) }, 1500)
  }

  async function kopioiPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setKopioitu(true)
      setTimeout(() => setKopioitu(false), 2000)
    } catch (e) {
      alert('Kopiointi epäonnistui: ' + (e.message ?? 'tuntematon'))
    }
  }

  return (
    <div style={korttiTyyli}>
      <h3 style={korttiOtsikkoTyyli}>🔍 Tarkistuskierros</h3>

      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
        Code käy ohjelman läpi, korjaa virheet, ehdottaa parannuksia.
        Välttämättömät tehtävät → TODO, ehdotukset → Koodaajan ideat.
      </p>

      <button
        type="button"
        onClick={() => setModaaliAuki(true)}
        style={{
          padding:       '14px 20px',
          minHeight:     '52px',
          borderRadius:  '12px',
          border:        'none',
          background:    'linear-gradient(135deg, #8b5cf6, #6366f1)',
          color:         'white',
          fontSize:      '15px',
          fontWeight:    700,
          cursor:        'pointer',
          letterSpacing: '0.02em',
          alignSelf:     'flex-start',
          boxShadow:     '0 2px 8px rgba(139, 92, 246, 0.25)',
        }}
      >
        🔍 Käynnistä tarkistuskierros
      </button>

      <div style={{
        background:   '#faf5ff',
        border:       '1px solid #ddd6fe',
        borderRadius: '10px',
        padding:      '10px 14px',
        fontSize:     '12px',
        color:        '#6b21a8',
        lineHeight:   1.5,
      }}>
        <div><strong>Edellinen kierros:</strong> {edellinen ? `${muotoilePvm(edellinen.luotu)} (${sittenTeksti(edellinen.luotu)})` : 'ei vielä yhtään'}</div>
        {edellinen && (edellinen.todo_lisatty != null || edellinen.ideat_lisatty != null) && (
          <div style={{ marginTop: '4px' }}>
            Lisätty silloin: <strong>{edellinen.todo_lisatty ?? 0} TODO</strong> + <strong>{edellinen.ideat_lisatty ?? 0} ehdotusta</strong>
          </div>
        )}
        <div style={{ marginTop: '4px' }}>Suositus: kerran 1–2 viikossa</div>
      </div>

      <button
        type="button"
        onClick={() => setLogiAuki(true)}
        style={{
          background: 'transparent', border: 'none', color: '#6366f1',
          fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-start',
          textDecoration: 'underline', padding: 0,
        }}
      >
        Aiempien tarkistusten lokit ({kierrokset.length}) →
      </button>

      {modaaliAuki && (
        <Modaali otsikko="Käynnistä tarkistuskierros" onSulje={() => { if (tila !== 'tallentaa') setModaaliAuki(false) }}>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Muokkaa promptia tarpeen mukaan. Kopioi se Claude Code -istuntoon
            ja tämä rivi tallentuu audit-lokiksi.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={14}
            style={{
              width: '100%', fontSize: '12px', fontFamily: 'monospace',
              padding: '10px 12px', borderRadius: '8px',
              border: '1px solid #e5e7eb', resize: 'vertical',
            }}
          />
          {tila === 'onnistui' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#166534' }}>
              ✓ Tallennettu — avaa Claude Code -istunto ja liitä prompt sinne.
            </div>
          )}
          {tila === 'virhe' && virhe && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#991b1b' }}>
              ✗ {virhe}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" onClick={kopioiPrompt} style={napinTyyli('beige')}>{kopioitu ? '✓ Kopioitu' : '📋 Kopioi'}</button>
            <button type="button" onClick={() => setModaaliAuki(false)} disabled={tila === 'tallentaa'} style={napinTyyli('beige')}>Peru</button>
            <button type="button" onClick={tallennaJaSulje} disabled={tila === 'tallentaa' || tila === 'onnistui'} style={napinTyyli('vihrea')}>
              {tila === 'tallentaa' ? 'Tallennetaan…' : 'OK, lähetän Codelle'}
            </button>
          </div>
        </Modaali>
      )}

      {logiAuki && (
        <Modaali otsikko="Aiemmat tarkistuskierrokset" onSulje={() => setLogiAuki(false)} maxWidth="720px">
          {kierrokset.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Ei vielä yhtään tarkistuskierrosta.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '500px', overflowY: 'auto' }}>
              {kierrokset.map((k) => (
                <li key={k.id} style={{
                  display: 'grid', gridTemplateColumns: '110px 90px 1fr', gap: '10px',
                  padding: '8px 12px', borderRadius: '8px',
                  background: k.status === 'valmis' ? '#f0fdf4' : k.status === 'pyydetty' ? '#eff6ff' : '#f3f4f6',
                  border: '1px solid #e5e7eb', fontSize: '12px',
                }}>
                  <span style={{ color: '#6b7280' }}>{muotoilePvm(k.luotu)}</span>
                  <span style={{ fontWeight: 600 }}>{k.status === 'valmis' ? '✓ Valmis' : k.status === 'pyydetty' ? '⏳ Pyydetty' : '· Peruutettu'}</span>
                  <span style={{ color: '#374151' }}>{k.yhteenveto ?? (k.prompt ?? '').split('\n')[0].slice(0, 80)}</span>
                </li>
              ))}
            </ul>
          )}
        </Modaali>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// OSA 2A — TODO-paneeli
// ─────────────────────────────────────────────────────────────────────────

function TodoPaneeli({ pb, pbHetiTallennus }) {
  const [suodatin, setSuodatin] = useState('kaikki')  // kaikki | korkea | keski | matala
  const [naytaKaikki, setNaytaKaikki] = useState(false)
  const [lomakeAuki,  setLomakeAuki]  = useState(false)
  const [uusiOtsikko, setUusiOtsikko] = useState('')
  const [uusiPrio,    setUusiPrio]    = useState('keski')
  const [valittu,     setValittu]     = useState(null)

  const aktiiviset = pb.todo.filter((t) => t.status !== 'done')
  const suodatetut = useMemo(() => {
    if (suodatin === 'kaikki') return aktiiviset
    return aktiiviset.filter((t) => (t.prioriteetti ?? 'keski') === suodatin)
  }, [aktiiviset, suodatin])

  const naytetyt = naytaKaikki ? suodatetut : suodatetut.slice(0, 5)

  function lisaa() {
    if (!uusiOtsikko.trim()) return
    const uusi = {
      id:           `todo-${Date.now()}`,
      teksti:       uusiOtsikko.trim(),
      kuvaus:       '',
      status:       'todo',
      prioriteetti: uusiPrio,
      lisätty:      new Date().toISOString(),
    }
    pbHetiTallennus((prev) => ({ ...prev, todo: [...prev.todo, uusi] }))
    setUusiOtsikko('')
    setLomakeAuki(false)
  }

  function merkitseValmiiksi(id) {
    pbHetiTallennus((prev) => ({
      ...prev,
      todo: prev.todo.map((t) => t.id === id ? { ...t, status: 'done', valmistunut: new Date().toISOString() } : t),
    }))
  }

  function paivitaTodo(id, muutos) {
    pbHetiTallennus((prev) => ({
      ...prev,
      todo: prev.todo.map((t) => t.id === id ? { ...t, ...muutos } : t),
    }))
    setValittu((v) => v && v.id === id ? { ...v, ...muutos } : v)
  }

  function poista(id) {
    pbHetiTallennus((prev) => ({ ...prev, todo: prev.todo.filter((t) => t.id !== id) }))
    setValittu(null)
  }

  return (
    <div style={korttiTyyli}>
      <h3 style={korttiOtsikkoTyyli}>
        📋 Välttämättömät tehtävät
        <span style={numeroPalluraTyyli('#374151')}>{aktiiviset.length}</span>
      </h3>

      {/* Suodattimet */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <Suodatin nimi="Kaikki" valittu={suodatin === 'kaikki'} onValitse={() => setSuodatin('kaikki')} maara={aktiiviset.length} />
        <Suodatin nimi="🔴 Korkea" valittu={suodatin === 'korkea'} onValitse={() => setSuodatin('korkea')} maara={aktiiviset.filter((t) => t.prioriteetti === 'korkea').length} vari="#ef4444" />
        <Suodatin nimi="🟡 Keski"  valittu={suodatin === 'keski'}  onValitse={() => setSuodatin('keski')}  maara={aktiiviset.filter((t) => (t.prioriteetti ?? 'keski') === 'keski').length} vari="#eab308" />
        <Suodatin nimi="🟢 Matala" valittu={suodatin === 'matala'} onValitse={() => setSuodatin('matala')} maara={aktiiviset.filter((t) => t.prioriteetti === 'matala').length} vari="#22c55e" />
      </div>

      {/* Lista */}
      {naytetyt.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
          {suodatin === 'kaikki' ? 'Ei avoimia tehtäviä — kaikki valmista 🎉' : 'Ei tämän prioriteetin tehtäviä.'}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {naytetyt.map((t) => {
            const p = PRIORITEETTI_VARIT[t.prioriteetti ?? 'keski']
            return (
              <li key={t.id} style={{
                display:      'grid',
                gridTemplateColumns: '12px 1fr auto auto',
                gap:          '8px',
                alignItems:   'center',
                fontSize:     '13px',
                padding:      '8px 12px',
                borderRadius: '8px',
                background:   p.tausta,
                border:       `1px solid ${p.vari}33`,
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.vari }} />
                <button
                  type="button"
                  onClick={() => setValittu(t)}
                  style={{
                    background: 'transparent', border: 'none', textAlign: 'left',
                    color: '#374151', fontSize: '13px', cursor: 'pointer',
                    padding: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  title={t.teksti}
                >
                  {t.teksti}
                </button>
                <button
                  type="button"
                  onClick={() => setValittu(t)}
                  title="Esikatsele kuvaus"
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: '1px solid #e5e7eb', background: 'white',
                    color: '#6b7280', cursor: 'pointer', fontSize: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  👀
                </button>
                <button
                  type="button"
                  onClick={() => merkitseValmiiksi(t.id)}
                  title="Merkitse valmiiksi"
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: `1px solid ${p.vari}`, background: 'white',
                    color: p.vari, cursor: 'pointer', fontSize: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✓
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!naytaKaikki && suodatetut.length > 5 && (
        <button
          type="button"
          onClick={() => setNaytaKaikki(true)}
          style={{
            background: 'transparent', border: 'none', color: '#6366f1',
            fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-start',
            textDecoration: 'underline', padding: 0,
          }}
        >
          Näytä loput {suodatetut.length - 5} →
        </button>
      )}

      {/* Lisää-rivi */}
      {!lomakeAuki ? (
        <button
          type="button"
          onClick={() => setLomakeAuki(true)}
          style={{
            background:   'transparent', border: '1px dashed #d1d5db',
            color:        '#6b7280', fontSize: '12px',
            padding:      '8px 12px', borderRadius: '8px', cursor: 'pointer',
            alignSelf:    'stretch',
          }}
        >
          + Lisää tehtävä
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
          <input
            type="text"
            value={uusiOtsikko}
            onChange={(e) => setUusiOtsikko(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lisaa()}
            placeholder="Tehtävän otsikko"
            autoFocus
            style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '13px' }}
          />
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={uusiPrio} onChange={(e) => setUusiPrio(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '12px' }}>
              <option value="korkea">🔴 Korkea</option>
              <option value="keski">🟡 Keski</option>
              <option value="matala">🟢 Matala</option>
            </select>
            <button type="button" onClick={lisaa} disabled={!uusiOtsikko.trim()} style={napinTyyli('vihrea')}>Lisää</button>
            <button type="button" onClick={() => { setLomakeAuki(false); setUusiOtsikko('') }} style={napinTyyli('beige')}>Peru</button>
          </div>
        </div>
      )}

      {valittu && (
        <TodoModaali
          todo={valittu}
          onSulje={() => setValittu(null)}
          onPaivita={(muutos) => paivitaTodo(valittu.id, muutos)}
          onMerkitseValmiiksi={() => { merkitseValmiiksi(valittu.id); setValittu(null) }}
          onPoista={() => poista(valittu.id)}
        />
      )}
    </div>
  )
}

function Suodatin({ nimi, valittu, onValitse, maara, vari = '#6b7280' }) {
  return (
    <button
      type="button"
      onClick={onValitse}
      style={{
        padding:      '4px 10px',
        borderRadius: '999px',
        border:       valittu ? `1.5px solid ${vari}` : '1px solid #e5e7eb',
        background:   valittu ? `${vari}1a` : 'white',
        color:        valittu ? vari : '#6b7280',
        fontSize:     '11px',
        fontWeight:   valittu ? 700 : 500,
        cursor:       'pointer',
      }}
    >
      {nimi} {maara > 0 && `· ${maara}`}
    </button>
  )
}

function TodoModaali({ todo, onSulje, onPaivita, onMerkitseValmiiksi, onPoista }) {
  const [kuvaus, setKuvaus] = useState(todo.kuvaus ?? '')
  const [prio,   setPrio]   = useState(todo.prioriteetti ?? 'keski')
  const [vaikutus, setVaikutus] = useState(todo.vaikutus ?? 'paikallinen')

  function tallenna() {
    onPaivita({ kuvaus, prioriteetti: prio, vaikutus })
  }

  return (
    <Modaali otsikko={todo.teksti} onSulje={onSulje} maxWidth="640px">
      <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
        Lisätty {muotoilePvm(todo.lisätty)}
      </p>

      <div>
        <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Kuvaus</label>
        <textarea
          value={kuvaus}
          onChange={(e) => setKuvaus(e.target.value)}
          rows={4}
          style={{ width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Prioriteetti</label>
          <select value={prio} onChange={(e) => setPrio(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '13px', display: 'block', marginTop: '4px' }}>
            <option value="korkea">🔴 Korkea</option>
            <option value="keski">🟡 Keski</option>
            <option value="matala">🟢 Matala</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Vaikutus</label>
          <select value={vaikutus} onChange={(e) => setVaikutus(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '13px', display: 'block', marginTop: '4px' }}>
            <option value="paikallinen">🟢 Paikallinen</option>
            <option value="vaikuttaa_useaan">🔴 Vaikuttaa useaan paikkaan</option>
            <option value="arkkitehtuuri">🟣 Arkkitehtuurin osa</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', flexWrap: 'wrap', marginTop: '8px' }}>
        <button type="button" onClick={onPoista} style={{ ...napinTyyli('punainen'), background: 'transparent', color: '#dc2626', border: '1px solid #fecaca' }}>
          🗑 Poista
        </button>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={onSulje} style={napinTyyli('beige')}>Sulje</button>
          <button type="button" onClick={() => { tallenna(); onSulje() }} style={napinTyyli('beige')}>Tallenna</button>
          <button type="button" onClick={onMerkitseValmiiksi} style={napinTyyli('vihrea')}>✓ Valmis</button>
        </div>
      </div>
    </Modaali>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// OSA 2B — Ehdotukset
// ─────────────────────────────────────────────────────────────────────────

function EhdotuksetPaneeli({ pb, pbHetiTallennus }) {
  const [naytaKaikki, setNaytaKaikki] = useState(false)
  const [hylkaaVahvistus, setHylkaaVahvistus] = useState(null)

  const ehdotukset = pb.ideat ?? []
  const naytetyt = naytaKaikki ? ehdotukset : ehdotukset.slice(0, 3)

  function siirraTodolle(idea) {
    pbHetiTallennus((prev) => ({
      ...prev,
      ideat: prev.ideat.filter((i) => i.id !== idea.id),
      todo: [...prev.todo, {
        id:           `todo-${Date.now()}`,
        teksti:       idea.teksti,
        kuvaus:       idea.kuvaus ?? '',
        status:       'todo',
        prioriteetti: 'keski',
        lisätty:      new Date().toISOString(),
        alkuperainen_idea_id: idea.id,
      }],
    }))
  }

  function hylkaa(id) {
    pbHetiTallennus((prev) => ({ ...prev, ideat: prev.ideat.filter((i) => i.id !== id) }))
    setHylkaaVahvistus(null)
  }

  return (
    <div style={korttiTyyli}>
      <h3 style={korttiOtsikkoTyyli}>
        💡 Koodaajan ehdotukset
        <span style={numeroPalluraTyyli('#8b5cf6')}>{ehdotukset.length}</span>
      </h3>

      {ehdotukset.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
          Ei ehdotuksia — käynnistä tarkistuskierros niin Code voi ehdottaa parannuksia.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {naytetyt.map((idea) => (
            <li key={idea.id} style={{
              padding:      '10px 12px',
              borderRadius: '8px',
              background:   '#faf5ff',
              border:       '1px solid #e9d5ff',
              display:      'flex',
              flexDirection: 'column',
              gap:          '8px',
            }}>
              <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
                {idea.teksti}
              </div>
              {idea.kuvaus && (
                <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>
                  {idea.kuvaus}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {hylkaaVahvistus === idea.id ? (
                  <>
                    <span style={{ fontSize: '11px', color: '#6b7280', alignSelf: 'center' }}>Varma?</span>
                    <button type="button" onClick={() => hylkaa(idea.id)} style={{ ...napinTyyli('punainen'), padding: '4px 10px', fontSize: '11px' }}>Kyllä, hylkää</button>
                    <button type="button" onClick={() => setHylkaaVahvistus(null)} style={{ ...napinTyyli('beige'), padding: '4px 10px', fontSize: '11px' }}>Peru</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => siirraTodolle(idea)} style={{ ...napinTyyli('vihrea'), padding: '4px 10px', fontSize: '11px' }}>+ TODO</button>
                    <button type="button" onClick={() => setHylkaaVahvistus(idea.id)} style={{ ...napinTyyli('beige'), padding: '4px 10px', fontSize: '11px' }}>Hylkää</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!naytaKaikki && ehdotukset.length > 3 && (
        <button
          type="button"
          onClick={() => setNaytaKaikki(true)}
          style={{
            background: 'transparent', border: 'none', color: '#8b5cf6',
            fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-start',
            textDecoration: 'underline', padding: 0,
          }}
        >
          Näytä kaikki {ehdotukset.length} →
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// OSA 3A — Changelog
// ─────────────────────────────────────────────────────────────────────────

function ChangelogPaneeli({ pb }) {
  const [logiAuki, setLogiAuki] = useState(false)
  const cl = pb.changelog ?? []
  const sorted = [...cl].sort((a, b) => (b.valmistunut ?? '').localeCompare(a.valmistunut ?? ''))
  const naytetyt = sorted.slice(0, 5)

  return (
    <div style={korttiTyyli}>
      <h3 style={korttiOtsikkoTyyli}>
        📝 Changelog
        <span style={numeroPalluraTyyli('#374151')}>{cl.length}</span>
      </h3>

      {cl.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>Ei vielä merkintöjä.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {naytetyt.map((c) => (
            <li key={c.id} style={{
              display: 'grid', gridTemplateColumns: '70px 1fr', gap: '10px',
              fontSize: '12px', padding: '6px 10px', borderRadius: '6px',
              background: '#f9fafb',
            }}>
              <span style={{ color: '#6b7280' }}>{muotoilePvmLyhyt(c.valmistunut)}</span>
              <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.teksti}>
                ✓ {c.teksti}
              </span>
            </li>
          ))}
        </ul>
      )}

      {cl.length > 5 && (
        <button
          type="button"
          onClick={() => setLogiAuki(true)}
          style={{
            background: 'transparent', border: 'none', color: '#6366f1',
            fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-start',
            textDecoration: 'underline', padding: 0,
          }}
        >
          Näytä koko changelog ({cl.length}) →
        </button>
      )}

      {logiAuki && (
        <Modaali otsikko="Koko changelog" onSulje={() => setLogiAuki(false)} maxWidth="720px">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '500px', overflowY: 'auto' }}>
            {sorted.map((c) => (
              <li key={c.id} style={{
                display: 'grid', gridTemplateColumns: '90px 1fr', gap: '10px',
                fontSize: '12px', padding: '6px 10px', borderRadius: '6px',
                background: '#f9fafb',
              }}>
                <span style={{ color: '#6b7280' }}>{muotoilePvmLyhyt(c.valmistunut)}</span>
                <span style={{ color: '#374151' }}>✓ {c.teksti}</span>
              </li>
            ))}
          </ul>
        </Modaali>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// OSA 3B — Visio
// ─────────────────────────────────────────────────────────────────────────

function VisioPaneeli({ pb, pbDebouncedTallennus }) {
  const [muokkausAuki, setMuokkausAuki] = useState(false)
  const [muokattu, setMuokattu] = useState(pb.visio ?? '')
  const visio = pb.visio ?? ''
  const lyhennetty = visio.length > 200 ? `${visio.slice(0, 200)}…` : visio

  function avaa() {
    setMuokattu(visio)
    setMuokkausAuki(true)
  }

  function tallenna() {
    pbDebouncedTallennus((prev) => ({ ...prev, visio: muokattu }))
    setMuokkausAuki(false)
  }

  return (
    <div style={korttiTyyli}>
      <h3 style={korttiOtsikkoTyyli}>🎯 Visio ja periaatteet</h3>
      {visio ? (
        <div style={{ fontSize: '13px', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {lyhennetty}
        </div>
      ) : (
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>Visio puuttuu — klikkaa Muokkaa.</p>
      )}
      <button
        type="button"
        onClick={avaa}
        style={{
          background: 'transparent', border: '1px solid #e5e7eb', color: '#374151',
          fontSize: '12px', padding: '6px 12px', borderRadius: '6px',
          cursor: 'pointer', alignSelf: 'flex-start',
        }}
      >
        Muokkaa →
      </button>

      {muokkausAuki && (
        <Modaali otsikko="Visio ja periaatteet" onSulje={() => setMuokkausAuki(false)} maxWidth="720px">
          <textarea
            value={muokattu}
            onChange={(e) => setMuokattu(e.target.value)}
            rows={20}
            style={{ width: '100%', fontSize: '13px', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', resize: 'vertical', lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setMuokkausAuki(false)} style={napinTyyli('beige')}>Peru</button>
            <button type="button" onClick={tallenna} style={napinTyyli('vihrea')}>Tallenna</button>
          </div>
        </Modaali>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// OSA 4 — Kehitysaktiivisuus 30 päivää
// ─────────────────────────────────────────────────────────────────────────

function AktiivisuusPaneeli() {
  const [pylvaat, setPylvaat] = useState(null)
  const [virhe, setVirhe] = useState(null)

  useEffect(() => {
    let peruttu = false
    async function lataa() {
      try {
        // GitHub API: viimeiset 100 commit-merkintää (per_page max 100)
        const since = new Date()
        since.setDate(since.getDate() - 30)
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/commits?since=${since.toISOString()}&per_page=100`,
          { headers: { Accept: 'application/vnd.github.v3+json' } }
        )
        if (!res.ok) throw new Error(`GitHub API: ${res.status}`)
        const data = await res.json()
        if (peruttu) return
        // Ryhmittele päivän mukaan
        const paivat = {}
        for (let i = 0; i < 30; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          d.setHours(0, 0, 0, 0)
          paivat[d.toISOString().slice(0, 10)] = 0
        }
        for (const c of data) {
          const pvm = c.commit?.author?.date?.slice(0, 10)
          if (pvm && paivat[pvm] !== undefined) paivat[pvm] += 1
        }
        const sorted = Object.entries(paivat).sort(([a], [b]) => a.localeCompare(b))
        setPylvaat(sorted)
      } catch (e) {
        if (!peruttu) setVirhe(e.message)
      }
    }
    lataa()
    return () => { peruttu = true }
  }, [])

  const kokonais = pylvaat?.reduce((s, [, n]) => s + n, 0) ?? 0
  const max = pylvaat?.reduce((m, [, n]) => Math.max(m, n), 0) ?? 0

  return (
    <div style={korttiTyyli}>
      <h3 style={korttiOtsikkoTyyli}>
        📈 Kehitysaktiivisuus
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>
          30 viime päivää · {kokonais} commit{kokonais === 1 ? '' : 'tia'}
        </span>
      </h3>
      {virhe ? (
        <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>Lataus epäonnistui: {virhe}</p>
      ) : !pylvaat ? (
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Ladataan…</p>
      ) : (
        <div style={{
          display:        'grid',
          gridTemplateColumns: 'repeat(30, 1fr)',
          gap:            '2px',
          height:         '64px',
          alignItems:     'flex-end',
        }}>
          {pylvaat.map(([pvm, n]) => {
            const korkeus = max > 0 ? (n / max) * 100 : 0
            return (
              <div
                key={pvm}
                title={`${pvm}: ${n} commit${n === 1 ? '' : 'tia'}`}
                style={{
                  background:   n === 0 ? '#f3f4f6' : '#6366f1',
                  height:       n === 0 ? '4px' : `${Math.max(korkeus, 8)}%`,
                  borderRadius: '2px',
                  cursor:       'help',
                  transition:   'background 0.15s',
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Apukomponentit
// ─────────────────────────────────────────────────────────────────────────

function Modaali({ otsikko, onSulje, maxWidth = '600px', children }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onSulje() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px', zIndex: 1000, overflowY: 'auto',
      }}
    >
      <div style={{
        background: 'white', borderRadius: '16px', width: '100%', maxWidth,
        margin: '40px auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{otsikko}</h2>
        {children}
      </div>
    </div>
  )
}

function napinTyyli(sävy) {
  const tyyli = {
    padding:      '8px 14px',
    minHeight:    '36px',
    borderRadius: '8px',
    fontSize:     '13px',
    fontWeight:   600,
    cursor:       'pointer',
  }
  if (sävy === 'vihrea')   return { ...tyyli, background: '#16a34a', color: 'white', border: 'none' }
  if (sävy === 'punainen') return { ...tyyli, background: '#dc2626', color: 'white', border: 'none' }
  if (sävy === 'beige')    return { ...tyyli, background: 'white', color: '#374151', border: '1px solid #e5e7eb' }
  return tyyli
}
