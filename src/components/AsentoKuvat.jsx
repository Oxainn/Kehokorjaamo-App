// KA1 + KA2 — Asentokuvat. Hoitokäynnin 4 kokovartalokuvaa (edestä/takaa/vasen/oikea)
// + automaattinen pose-detection (TensorFlow.js MoveNet).
//
// Kuva otetaan puhelimen / tabletin kameralla (capture="environment") tai
// galleriasta. Pakataan canvas-API:lla ennen DB:hen tallennusta:
//   - max 1200x1600 px (skaalaus jos isompi)
//   - JPEG laatu 0.85
//   - tavoite < 500 KB per kuva
//
// KA2: Tallennuksen jälkeen ajetaan pose-detection (lazy-loaded MoveNet
// Thunder). Keypointit tallennetaan asentokuvat.keypointit-sarakkeeseen ja
// piirretään luurangoksi suurennusmodaalin canvas-overlayssa.
//
// KA3-KA6 lisäävät kulmien laskennan, manuaalisen korjauksen ja vertailun
// ilman skeemamuutosta.

import { useEffect, useRef, useState } from 'react'
import {
  haeAsentokuvat,
  tallennaAsentokuva,
  poistaAsentokuva,
  paivitaAsentokuvanKeypointit,
  paivitaKeypointitJaKulmat,
} from '../lib/db'
import {
  tunnistaKeypointit,
  laskeKulmat,
  formatoiKulma,
  KULMA_SELITTEET,
  SKELETTI_LINJAT,
  CONFIDENCE_RAJA,
  CONFIDENCE_VARIT,
  luokitaConfidence,
} from '../lib/poseAnalysis'
import { Vertailu, Aikajana } from './AsentoVertailu'

const NAKOKULMAT = [
  { id: 'edesta', nimi: 'Edestä' },
  { id: 'takaa',  nimi: 'Takaa' },
  { id: 'vasen',  nimi: 'Vasen sivu' },
  { id: 'oikea',  nimi: 'Oikea sivu' },
]

const MAX_LEVEYS = 1200
const MAX_KORKEUS = 1600
const JPEG_LAATU = 0.85

// Lue tiedosto → ImageBitmap (EXIF-rotaatio sovellettu) → pakkaa canvasilla → JPEG base64.
//
// EXIF-fix: mobiilikamera tallentaa kuvan natiivissa sensori-orientaatiossa
// (esim. landscape) ja merkitsee oikean rotaation EXIF Orientation -tagiin.
// Canvas drawImage ei oletuksena sovella tätä → kuva oli kyljellään → MoveNet
// ei tunnistanut ihmistä (vain 3/17 keypointia).
//
// createImageBitmap(blob, { imageOrientation: 'from-image' }) lukee EXIF:n ja
// palauttaa bitmapin oikein rotatoituna. Tuettu kaikissa moderneissa selaimissa
// (Chrome 79+, Safari 15+, Firefox 90+).
async function pakkaaKuva(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Vanhempi selain — fallback HTMLImageElementiin (ei EXIF-tukea)
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    bitmap = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = dataUrl
    })
  }
  const w0 = bitmap.width ?? bitmap.naturalWidth
  const h0 = bitmap.height ?? bitmap.naturalHeight
  // Skaalaus säilyttäen suhde — sopii laatikkoon MAX_LEVEYS x MAX_KORKEUS
  const skaala = Math.min(MAX_LEVEYS / w0, MAX_KORKEUS / h0, 1)
  const w = Math.round(w0 * skaala)
  const h = Math.round(h0 * skaala)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)
  if (bitmap.close) bitmap.close()
  return canvas.toDataURL('image/jpeg', JPEG_LAATU)
}

export default function AsentoKuvat({ hoitokayntiId, asiakasId, asiakasPituusCm }) {
  const [kuvat, setKuvat] = useState({})  // { edesta: {id, kuva_data, keypointit, ...}, ... }
  const [lataus, setLataus] = useState(null)  // nakokulma jolle juuri pakataan
  const [analyysi, setAnalyysi] = useState({})  // { edesta: 'analyysi'|'valmis'|'virhe', ... }
  const [valittu, setValittu] = useState(null)  // suurennusmodaalin avain
  const [virhe, setVirhe] = useState(null)
  const [valilehti, setValilehti] = useState('tama')  // KA6: tama | vertailu | aikajana

  useEffect(() => {
    if (!hoitokayntiId) return
    let peruttu = false
    haeAsentokuvat(hoitokayntiId).then((rivit) => {
      if (peruttu) return
      const kartalle = {}
      const tilat = {}
      for (const r of rivit) {
        // KA4: keypointit voi olla joko flat array (legacy/AI-only) tai
        // { ai, nykyiset } -objekti (manuaalisesti korjattu)
        const raw = r.keypointit
        let ai = null, nykyiset = null
        if (Array.isArray(raw)) {
          ai = raw
          nykyiset = raw
        } else if (raw && typeof raw === 'object') {
          ai = raw.ai ?? raw.nykyiset ?? null
          nykyiset = raw.nykyiset ?? raw.ai ?? null
        }
        kartalle[r.nakokulma] = {
          ...r,
          keypointit:    nykyiset,
          ai_keypointit: ai,
        }
        if (nykyiset) tilat[r.nakokulma] = 'valmis'
      }
      setKuvat(kartalle)
      setAnalyysi(tilat)
    })
    return () => { peruttu = true }
  }, [hoitokayntiId])

  async function kasittelyTiedosto(file, nakokulma) {
    if (!file || !hoitokayntiId || !asiakasId) return
    setLataus(nakokulma)
    setVirhe(null)
    try {
      const pakattu = await pakkaaKuva(file)
      const tulos = await tallennaAsentokuva({
        hoitokayntiId,
        asiakasId,
        nakokulma,
        kuvaData: pakattu,
      })
      if (tulos.virhe) {
        setVirhe(`Tallennus epäonnistui: ${tulos.virhe}`)
        return
      }
      const kuvaTallennettu = { ...tulos.kuva, kuva_data: pakattu }
      setKuvat((prev) => ({ ...prev, [nakokulma]: kuvaTallennettu }))
      setAnalyysi((prev) => ({ ...prev, [nakokulma]: 'analyysi' }))
      // Aja pose-detection taustalla — ei estä käyttäjää lisäämästä muita kuvia
      ajaPoseDetection(kuvaTallennettu.id, pakattu, nakokulma)
    } catch (e) {
      setVirhe(`Kuvan käsittely epäonnistui: ${e.message ?? 'tuntematon'}`)
    } finally {
      setLataus(null)
    }
  }

  async function ajaPoseDetection(kuvaId, kuvaData, nakokulma) {
    try {
      const tulos = await tunnistaKeypointit(kuvaData)
      if (tulos.virhe) {
        setAnalyysi((prev) => ({ ...prev, [nakokulma]: 'virhe' }))
        setKuvat((prev) => ({
          ...prev,
          [nakokulma]: { ...prev[nakokulma], analyysiVirhe: tulos.virhe },
        }))
        return
      }
      // KA3: laske kulmat samalla — tallennetaan keypointit + kulmat yhdessä
      const kulmat = laskeKulmat(tulos.keypointit, nakokulma, asiakasPituusCm)
      const dbTulos = await paivitaKeypointitJaKulmat(kuvaId, tulos.keypointit, kulmat)
      if (dbTulos.virhe) {
        setAnalyysi((prev) => ({ ...prev, [nakokulma]: 'virhe' }))
        return
      }
      setKuvat((prev) => ({
        ...prev,
        [nakokulma]: {
          ...prev[nakokulma],
          keypointit:    tulos.keypointit,
          ai_keypointit: tulos.keypointit,  // KA4: alkuperäiset reset-nappia varten
          kulmat,
          hyvienMaara:   tulos.hyvienMaara,
          kokonaisMaara: tulos.kokonaisMaara,
          kuvaLeveys:    tulos.kuvaLeveys,
          kuvaKorkeus:   tulos.kuvaKorkeus,
        },
      }))
      setAnalyysi((prev) => ({ ...prev, [nakokulma]: 'valmis' }))
    } catch (e) {
      console.error('Pose-detection epäonnistui:', e)
      setAnalyysi((prev) => ({ ...prev, [nakokulma]: 'virhe' }))
    }
  }

  async function poista(nakokulma) {
    const kuva = kuvat[nakokulma]
    if (!kuva?.id) return
    const ok = window.confirm(`Poistetaanko ${NAKOKULMAT.find((n) => n.id === nakokulma)?.nimi.toLowerCase()}-kuva?`)
    if (!ok) return
    const tulos = await poistaAsentokuva(kuva.id)
    if (tulos.virhe) {
      setVirhe(`Poisto epäonnistui: ${tulos.virhe}`)
      return
    }
    setKuvat((prev) => {
      const u = { ...prev }
      delete u[nakokulma]
      return u
    })
    setAnalyysi((prev) => {
      const u = { ...prev }
      delete u[nakokulma]
      return u
    })
    setValittu(null)
  }

  if (!hoitokayntiId) {
    return (
      <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
        Asentokuvat tallentuvat hoitokäyntiin — aloita käynti ensin.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* KA6: Välilehdet */}
      <Valilehdet valittu={valilehti} onVaihda={setValilehti} />

      {valilehti === 'tama' && (
        <>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
            Ota 4 kokovartalokuvaa: edestä, takaa, vasemmalta sivulta, oikealta sivulta.
            Kuvat pakataan automaattisesti ennen tallennusta (max ~500 KB per kuva).
            Tallennuksen jälkeen ajetaan automaattinen asennon analyysi (17 keypointia).
          </p>

          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap:                 '10px',
          }}>
            {NAKOKULMAT.map((n) => (
              <KuvaSlot
                key={n.id}
                nakokulma={n}
                kuva={kuvat[n.id]}
                tila={analyysi[n.id]}
                onLisaa={(file) => kasittelyTiedosto(file, n.id)}
                onAvaaSuurennus={() => setValittu(n.id)}
                lataa={lataus === n.id}
              />
            ))}
          </div>
        </>
      )}

      {valilehti === 'vertailu' && (
        <Vertailu hoitokayntiId={hoitokayntiId} asiakasId={asiakasId} />
      )}

      {valilehti === 'aikajana' && (
        <Aikajana hoitokayntiId={hoitokayntiId} asiakasId={asiakasId} />
      )}

      {virhe && (
        <div style={{
          background:   '#fef2f2',
          border:       '1px solid #fecaca',
          borderRadius: '8px',
          padding:      '8px 12px',
          fontSize:     '12px',
          color:        '#991b1b',
        }}>
          ✗ {virhe}
        </div>
      )}

      {valittu && kuvat[valittu] && (
        <SuurennusModaali
          nakokulma={NAKOKULMAT.find((n) => n.id === valittu)}
          kuva={kuvat[valittu]}
          tila={analyysi[valittu]}
          asiakasPituusCm={asiakasPituusCm}
          onSulje={() => setValittu(null)}
          onPoista={() => poista(valittu)}
          onVaihda={(file) => { setValittu(null); kasittelyTiedosto(file, valittu) }}
          onPaivitaKeypointit={async (uudetKp, alkuperaiset) => {
            // KA4: manuaalisen korjauksen tallennus
            const kulmat = laskeKulmat(uudetKp, valittu, asiakasPituusCm)
            const merged = { ai: alkuperaiset, nykyiset: uudetKp }
            await paivitaKeypointitJaKulmat(kuvat[valittu].id, merged, kulmat)
            setKuvat((prev) => ({
              ...prev,
              [valittu]: {
                ...prev[valittu],
                keypointit:     uudetKp,
                ai_keypointit:  alkuperaiset,
                kulmat,
              },
            }))
          }}
        />
      )}
    </div>
  )
}

// KA6 — välilehti-vaihdin AsentoKuvat-kortin yläosaan.
function Valilehdet({ valittu, onVaihda }) {
  const tabit = [
    { id: 'tama',     nimi: 'Tämä käynti' },
    { id: 'vertailu', nimi: 'Vertailu' },
    { id: 'aikajana', nimi: 'Aikajana' },
  ]
  return (
    <div style={{
      display:    'flex',
      gap:        '4px',
      borderBottom: '1px solid #e5e7eb',
      marginBottom: '4px',
    }}>
      {tabit.map((t) => {
        const aktiivinen = valittu === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onVaihda(t.id)}
            style={{
              padding:      '8px 14px',
              fontSize:     '12px',
              fontWeight:   aktiivinen ? 700 : 500,
              color:        aktiivinen ? '#1d4ed8' : '#6b7280',
              background:   'transparent',
              border:       'none',
              borderBottom: aktiivinen ? '2px solid #1d4ed8' : '2px solid transparent',
              marginBottom: '-1px',
              cursor:       'pointer',
            }}
          >
            {t.nimi}
          </button>
        )
      })}
    </div>
  )
}

function KuvaSlot({ nakokulma, kuva, tila, onLisaa, onAvaaSuurennus, lataa }) {
  const inputRef = useRef(null)
  const onKuva = !!kuva

  function valitse(e) {
    const file = e.target.files?.[0]
    if (file) onLisaa(file)
    e.target.value = ''  // salli saman tiedoston uudelleenvalinta
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div
        onClick={onKuva ? onAvaaSuurennus : () => inputRef.current?.click()}
        style={{
          position:      'relative',
          aspectRatio:   '3/4',
          background:    onKuva ? 'transparent' : '#f9fafb',
          border:        onKuva ? '1px solid #e5e7eb' : '1px dashed #d1d5db',
          borderRadius:  '10px',
          cursor:        'pointer',
          overflow:      'hidden',
          display:       'flex',
          alignItems:    'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap:           '6px',
        }}
      >
        {onKuva ? (
          <img
            src={kuva.kuva_data}
            alt={nakokulma.nimi}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : lataa ? (
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Pakataan…</span>
        ) : (
          <>
            <span style={{ fontSize: '32px' }}>📷</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em' }}>
              {nakokulma.nimi.toUpperCase()}
            </span>
          </>
        )}
        {onKuva && (
          <div style={{
            position:    'absolute',
            bottom:      0,
            left:        0,
            right:       0,
            padding:     '4px 8px',
            background:  'rgba(0, 0, 0, 0.55)',
            color:       'white',
            fontSize:    '10px',
            fontWeight:  700,
            letterSpacing: '0.05em',
            textAlign:   'center',
          }}>
            {nakokulma.nimi.toUpperCase()}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={valitse}
          style={{ display: 'none' }}
        />
      </div>
      {onKuva && <AnalyysiTila tila={tila} kuva={kuva} />}
    </div>
  )
}

function AnalyysiTila({ tila, kuva }) {
  if (tila === 'analyysi') {
    return (
      <span style={{ fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#3b82f6', animation: 'pulse 1.5s ease-in-out infinite',
        }} />
        🤖 Analysoidaan…
      </span>
    )
  }
  if (tila === 'valmis') {
    const hyvat = kuva.hyvienMaara ?? (kuva.keypointit ?? []).filter((p) => p.score >= CONFIDENCE_RAJA).length
    const yht   = kuva.kokonaisMaara ?? (kuva.keypointit ?? []).length
    return (
      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
        ✓ Analysoitu ({hyvat}/{yht})
      </span>
    )
  }
  if (tila === 'virhe') {
    return (
      <span style={{ fontSize: '11px', color: '#dc2626' }}>
        ⚠ Ei tunnistettu
      </span>
    )
  }
  return null
}

// Piirrä keypointit ja luuranko canvas-overlayna kuvan päälle.
// Skaalataan kuvan luonnollisesta koosta canvas-display-kokoon.
function piirraLuuranko(canvas, img, keypointit) {
  if (!canvas || !img || !keypointit?.length) return
  const ctx = canvas.getContext('2d')
  // Aseta canvas-koko vastaamaan kuvan näytettyä kokoa
  const rect = img.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  const sx = rect.width / img.naturalWidth
  const sy = rect.height / img.naturalHeight

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Indeksoi keypointit nimellä piirtoa varten
  const kpMap = {}
  for (const kp of keypointit) kpMap[kp.name] = kp

  // Piirrä luurangon yhteyspisteet ensin (alle pisteiden). Vain kun molemmat
  // päät ovat luotettavia (score >= CONFIDENCE_RAJA), muuten linja olisi
  // harhaanjohtava.
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 4
  for (const [a, b] of SKELETTI_LINJAT) {
    const pa = kpMap[a]
    const pb = kpMap[b]
    if (!pa || !pb) continue
    if (pa.score < CONFIDENCE_RAJA || pb.score < CONFIDENCE_RAJA) continue
    ctx.beginPath()
    ctx.moveTo(pa.x * sx, pa.y * sy)
    ctx.lineTo(pb.x * sx, pb.y * sy)
    ctx.stroke()
  }
  ctx.shadowBlur = 0

  // Piirrä KAIKKI 17 keypointia confidence-värillä. KA2-fixin jälkeen
  // näytetään myös huonot pisteet (punaisella) jotta käyttäjä tietää korjata
  // ne KA4:ssä raahaamalla.
  for (const kp of keypointit) {
    const luokka = luokitaConfidence(kp.score)
    const vari = CONFIDENCE_VARIT[luokka]
    const x = kp.x * sx
    const y = kp.y * sy
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fillStyle = vari
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'white'
    ctx.stroke()
  }
}

function SuurennusModaali({
  nakokulma, kuva, tila, asiakasPituusCm,
  onSulje, onPoista, onVaihda, onPaivitaKeypointit,
}) {
  const inputRef = useRef(null)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const [naytaLuuranko, setNaytaLuuranko] = useState(true)

  // KA4: paikallinen keypoint-tila raahausta varten. Synkronoidaan
  // kuva.keypointit-propsista, mutta drag-vaiheessa muutetaan paikallisesti
  // ennen DB-tallennusta (drag-release).
  const [paikallisetKp, setPaikallisetKp] = useState(kuva.keypointit ?? null)
  const [draggedIdx, setDraggedIdx] = useState(null)

  // Synkronoi kun pop-uppia vaihdetaan tai keypointit päivittyvät ulkopuolelta
  useEffect(() => {
    setPaikallisetKp(kuva.keypointit ?? null)
  }, [kuva.keypointit])

  const aiKp = kuva.ai_keypointit
  // Onko muokattu? Vertaa nykyinen vs alkuperäinen
  const muokattu = !!(aiKp && paikallisetKp && aiKp !== paikallisetKp &&
    paikallisetKp.some((p, i) => {
      const a = aiKp[i]
      return !a || Math.abs(p.x - a.x) > 0.5 || Math.abs(p.y - a.y) > 0.5
    }))

  function valitse(e) {
    const file = e.target.files?.[0]
    if (file) onVaihda(file)
    e.target.value = ''
  }

  // Piirrä luuranko kun kuva ladattu / keypointit muuttuvat
  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const piirra = () => {
      const c = canvasRef.current
      if (!c) return
      if (!naytaLuuranko || !paikallisetKp) {
        c.getContext('2d').clearRect(0, 0, c.width, c.height)
        // Mutta canvasin koko pitää silti vastata kuvan kokoa hit-testin takia
        const rect = img.getBoundingClientRect()
        c.width = rect.width
        c.height = rect.height
        c.style.width = `${rect.width}px`
        c.style.height = `${rect.height}px`
        return
      }
      piirraLuuranko(c, img, paikallisetKp)
    }
    if (img.complete && img.naturalWidth > 0) {
      piirra()
    } else {
      img.addEventListener('load', piirra, { once: true })
    }
    const ro = new ResizeObserver(piirra)
    ro.observe(img)
    return () => ro.disconnect()
  }, [paikallisetKp, naytaLuuranko])

  // Hit-test: löydä lähin keypoint canvas-koordinaatissa, ottaen huomioon
  // skaalauksen alkuperäisestä kuvakoosta canvasin näytökokoon.
  function loydaKeypoint(canvasX, canvasY) {
    if (!paikallisetKp || !imgRef.current) return -1
    const img = imgRef.current
    const sx = canvasRef.current.width / img.naturalWidth
    const sy = canvasRef.current.height / img.naturalHeight
    let parasIdx = -1
    let parasEt  = Infinity
    const KYNNYS = 18  // pikseleitä canvasilla
    for (let i = 0; i < paikallisetKp.length; i++) {
      const kp = paikallisetKp[i]
      const dx = kp.x * sx - canvasX
      const dy = kp.y * sy - canvasY
      const et = Math.sqrt(dx * dx + dy * dy)
      if (et < KYNNYS && et < parasEt) {
        parasEt = et
        parasIdx = i
      }
    }
    return parasIdx
  }

  function canvasXY(e) {
    const c = canvasRef.current
    if (!c) return null
    const rect = c.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onPointerDown(e) {
    if (!paikallisetKp || !onPaivitaKeypointit) return
    const xy = canvasXY(e)
    if (!xy) return
    const idx = loydaKeypoint(xy.x, xy.y)
    if (idx < 0) return
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    setDraggedIdx(idx)
  }

  function onPointerMove(e) {
    if (draggedIdx == null) return
    const c = canvasRef.current
    const img = imgRef.current
    if (!c || !img) return
    const rect = c.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    // Rajaa canvasin sisälle
    const cx = Math.max(0, Math.min(rect.width, x))
    const cy = Math.max(0, Math.min(rect.height, y))
    const sx = c.width / img.naturalWidth
    const sy = c.height / img.naturalHeight
    setPaikallisetKp((prev) => {
      const u = prev.slice()
      u[draggedIdx] = {
        ...u[draggedIdx],
        x: cx / sx,
        y: cy / sy,
        score: 1.0,  // manuaalisesti asetettu = täysi varmuus
      }
      return u
    })
  }

  async function onPointerUp(e) {
    if (draggedIdx == null) return
    canvasRef.current?.releasePointerCapture(e.pointerId)
    setDraggedIdx(null)
    if (paikallisetKp && onPaivitaKeypointit) {
      // Tallenna DB:hen ja päivitä parent-state. ai_keypointit pysyy alkup.
      onPaivitaKeypointit(paikallisetKp, aiKp ?? paikallisetKp)
    }
  }

  function reset() {
    if (!aiKp) return
    setPaikallisetKp(aiKp)
    if (onPaivitaKeypointit) onPaivitaKeypointit(aiKp.slice(), aiKp)
  }

  // Cursor: grab pisteen päällä, grabbing raahatessa
  const [hover, setHover] = useState(false)
  function onPointerHover(e) {
    if (!paikallisetKp || !onPaivitaKeypointit) return
    const xy = canvasXY(e)
    if (!xy) return
    setHover(loydaKeypoint(xy.x, xy.y) >= 0)
  }

  const onKeypointit = !!paikallisetKp
  const hyvat = (paikallisetKp ?? []).filter((p) => p.score >= CONFIDENCE_RAJA).length
  const yht   = (paikallisetKp ?? []).length

  // KA3: laske kulmat reaaliajassa paikallisista keypointeistä (näyttöä varten)
  const kulmatNyt = paikallisetKp
    ? laskeKulmat(paikallisetKp, nakokulma?.id, asiakasPituusCm)
    : null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onSulje() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', zIndex: 1000,
      }}
    >
      <div style={{
        background:    'white',
        borderRadius:  '16px',
        maxWidth:      '95vw',
        maxHeight:     '92vh',
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
        boxShadow:     '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        <div style={{
          padding:    '12px 16px',
          borderBottom: '1px solid #f3f4f6',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>
            {nakokulma?.nimi}
            {onKeypointit && (
              <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 500, color: '#16a34a' }}>
                ✓ {hyvat}/{yht} pistettä
              </span>
            )}
            {muokattu && (
              <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 600, color: '#7c3aed' }}>
                · manuaalisesti korjattu
              </span>
            )}
            {tila === 'analyysi' && (
              <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 500, color: '#3b82f6' }}>
                🤖 Analysoidaan…
              </span>
            )}
            {tila === 'virhe' && (
              <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 500, color: '#dc2626' }}>
                ⚠ {kuva.analyysiVirhe ?? 'Pose-detection epäonnistui'}
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={onSulje}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}
          >
            ✕
          </button>
        </div>

        {/* Sisältö: kuva+canvas vasemmalla, kulmat-lista oikealla */}
        <div style={{
          display:       'flex',
          flexDirection: 'row',
          flexWrap:      'wrap',
          flex:          1,
          minHeight:     0,
          overflow:      'auto',
        }}>
          <div style={{
            position:       'relative',
            background:     '#000',
            display:        'flex',
            justifyContent: 'center',
            alignItems:     'center',
            flex:           '1 1 auto',
            minWidth:       '300px',
          }}>
            <img
              ref={imgRef}
              src={kuva.kuva_data}
              alt={nakokulma?.nimi}
              style={{ maxWidth: '70vw', maxHeight: 'calc(85vh - 160px)', objectFit: 'contain', display: 'block', userSelect: 'none' }}
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={(e) => { onPointerMove(e); onPointerHover(e) }}
              onPointerUp={onPointerUp}
              onPointerLeave={() => setHover(false)}
              style={{
                position:      'absolute',
                top:           '50%',
                left:          '50%',
                transform:     'translate(-50%, -50%)',
                pointerEvents: onPaivitaKeypointit ? 'auto' : 'none',
                cursor:        draggedIdx != null ? 'grabbing' : (hover ? 'grab' : 'default'),
                touchAction:   'none',
              }}
            />
          </div>

          {/* KA3: Kulmat-lista */}
          {kulmatNyt && (
            <div style={{
              flex:        '0 0 280px',
              maxWidth:    '320px',
              padding:     '14px 16px',
              borderLeft:  '1px solid #f3f4f6',
              background:  '#fafafa',
              fontSize:    '12px',
              overflow:    'auto',
            }}>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Lasketut kulmat
              </h4>
              <KulmaLista kulmat={kulmatNyt} />
              {kulmatNyt.kalibrointi?.pituus_cm && (
                <p style={{ fontSize: '10px', color: '#9ca3af', margin: '12px 0 0 0', lineHeight: 1.4 }}>
                  Kalibrointi: {kulmatNyt.kalibrointi.pituus_cm} cm
                  {asiakasPituusCm ? '' : ' (oletus)'} ·
                  {' '}{kulmatNyt.kalibrointi.pikseleita_per_cm} px/cm
                </p>
              )}
            </div>
          )}
        </div>

        <div style={{
          padding:    '10px 16px',
          borderTop:  '1px solid #f3f4f6',
          display:    'flex',
          gap:        '8px',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap:   'wrap',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {onKeypointit && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={naytaLuuranko}
                  onChange={(e) => setNaytaLuuranko(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Näytä luuranko
              </label>
            )}
            {onKeypointit && onPaivitaKeypointit && (
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                Vihjeitä: raahaa pisteitä korjataksesi sijaintia
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {muokattu && (
              <button
                type="button"
                onClick={reset}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: '13px', cursor: 'pointer' }}
              >
                ↺ Reset (AI:n pisteet)
              </button>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: '13px', cursor: 'pointer' }}
            >
              🔄 Vaihda kuva
            </button>
            <button
              type="button"
              onClick={onPoista}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '13px', cursor: 'pointer' }}
            >
              🗑 Poista
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={valitse}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// KA3 — kulmalistan rivi-renderöinti. Suodatetaan pois kalibrointi-kenttä
// ja arvot joille ei löydy selitettä.
function KulmaLista({ kulmat }) {
  const rivit = []
  for (const avain of Object.keys(KULMA_SELITTEET)) {
    if (!(avain in kulmat)) continue
    const arvo = kulmat[avain]
    if (arvo == null) continue
    const sel = KULMA_SELITTEET[avain]
    const formatoitu = formatoiKulma(avain, arvo)
    rivit.push({ avain, otsikko: sel.otsikko, arvo, formatoitu })
  }
  if (rivit.length === 0) {
    return <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
      Ei riittävästi luotettavia keypointteja kulmien laskentaan.
    </p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {rivit.map((r) => {
        const merkittava = onMerkittava(r.avain, r.arvo)
        return (
          <div key={r.avain} style={{
            display:       'flex',
            flexDirection: 'column',
            padding:       '6px 8px',
            background:    merkittava ? '#fef3c7' : 'white',
            border:        `1px solid ${merkittava ? '#fde68a' : '#e5e7eb'}`,
            borderRadius:  '6px',
          }}>
            <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600 }}>
              {r.otsikko}
            </span>
            <span style={{ fontSize: '12px', color: '#111827', fontWeight: 500 }}>
              {r.formatoitu}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Onko kulman arvo kliinisesti merkittävä? Korostaa visuaalisesti
// huomionarvoiset poikkeamat.
function onMerkittava(avain, arvo) {
  const abs = Math.abs(arvo)
  if (avain.endsWith('_cm')) return abs > 1.0  // > 1 cm korkeusero/työntyminen
  if (avain.endsWith('_aste')) return abs > 3.0  // > 3° kallistus
  return false
}
