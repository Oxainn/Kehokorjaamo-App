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
} from '../lib/db'
import {
  tunnistaKeypointit,
  SKELETTI_LINJAT,
  KEYPOINT_RYHMA,
  RYHMA_VARIT,
  CONFIDENCE_RAJA,
} from '../lib/poseAnalysis'

const NAKOKULMAT = [
  { id: 'edesta', nimi: 'Edestä' },
  { id: 'takaa',  nimi: 'Takaa' },
  { id: 'vasen',  nimi: 'Vasen sivu' },
  { id: 'oikea',  nimi: 'Oikea sivu' },
]

const MAX_LEVEYS = 1200
const MAX_KORKEUS = 1600
const JPEG_LAATU = 0.85

// Lue tiedosto → HTMLImageElement → pakkaa canvasilla → JPEG base64.
async function pakkaaKuva(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = dataUrl
  })
  // Skaalaus säilyttäen suhde — sopii laatikkoon MAX_LEVEYS x MAX_KORKEUS
  const skaala = Math.min(MAX_LEVEYS / img.width, MAX_KORKEUS / img.height, 1)
  const w = Math.round(img.width * skaala)
  const h = Math.round(img.height * skaala)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', JPEG_LAATU)
}

export default function AsentoKuvat({ hoitokayntiId, asiakasId }) {
  const [kuvat, setKuvat] = useState({})  // { edesta: {id, kuva_data, keypointit, ...}, ... }
  const [lataus, setLataus] = useState(null)  // nakokulma jolle juuri pakataan
  const [analyysi, setAnalyysi] = useState({})  // { edesta: 'analyysi'|'valmis'|'virhe', ... }
  const [valittu, setValittu] = useState(null)  // suurennusmodaalin avain
  const [virhe, setVirhe] = useState(null)

  useEffect(() => {
    if (!hoitokayntiId) return
    let peruttu = false
    haeAsentokuvat(hoitokayntiId).then((rivit) => {
      if (peruttu) return
      const kartalle = {}
      const tilat = {}
      for (const r of rivit) {
        kartalle[r.nakokulma] = r
        if (r.keypointit) tilat[r.nakokulma] = 'valmis'
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
      const dbTulos = await paivitaAsentokuvanKeypointit(kuvaId, tulos.keypointit)
      if (dbTulos.virhe) {
        setAnalyysi((prev) => ({ ...prev, [nakokulma]: 'virhe' }))
        return
      }
      setKuvat((prev) => ({
        ...prev,
        [nakokulma]: {
          ...prev[nakokulma],
          keypointit:    tulos.keypointit,
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
          onSulje={() => setValittu(null)}
          onPoista={() => poista(valittu)}
          onVaihda={(file) => { setValittu(null); kasittelyTiedosto(file, valittu) }}
        />
      )}
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

  // Piirrä luurangon yhteyspisteet ensin (alle pisteiden)
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

  // Piirrä keypointit
  for (const kp of keypointit) {
    const ryhma = KEYPOINT_RYHMA[kp.name]
    const vari = RYHMA_VARIT[ryhma] ?? '#9ca3af'
    const epavarma = kp.score < CONFIDENCE_RAJA
    const x = kp.x * sx
    const y = kp.y * sy

    if (epavarma) {
      // Epävarmoille keltainen rengas — "korjaa myöhemmin"
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#fde68a'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#ca8a04'
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = vari
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = 'white'
      ctx.stroke()
    }
  }
}

function SuurennusModaali({ nakokulma, kuva, tila, onSulje, onPoista, onVaihda }) {
  const inputRef = useRef(null)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const [naytaLuuranko, setNaytaLuuranko] = useState(true)

  function valitse(e) {
    const file = e.target.files?.[0]
    if (file) onVaihda(file)
    e.target.value = ''
  }

  // Piirrä luuranko kun kuva on ladattu tai keypointit muuttuvat
  useEffect(() => {
    if (!naytaLuuranko) {
      const c = canvasRef.current
      if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height)
      return
    }
    const img = imgRef.current
    if (!img || !kuva.keypointit) return
    const piirra = () => piirraLuuranko(canvasRef.current, img, kuva.keypointit)
    if (img.complete && img.naturalWidth > 0) {
      piirra()
    } else {
      img.addEventListener('load', piirra, { once: true })
    }
    // Resize-handler — canvasin pitää seurata kuvan kokoa
    const ro = new ResizeObserver(piirra)
    ro.observe(img)
    return () => ro.disconnect()
  }, [kuva.keypointit, naytaLuuranko])

  const onKeypointit = !!kuva.keypointit
  const hyvat = kuva.hyvienMaara ?? (kuva.keypointit ?? []).filter((p) => p.score >= CONFIDENCE_RAJA).length
  const yht   = kuva.kokonaisMaara ?? (kuva.keypointit ?? []).length

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
        background:   'white',
        borderRadius: '16px',
        maxWidth:     '90vw',
        maxHeight:    '90vh',
        display:      'flex',
        flexDirection: 'column',
        overflow:     'hidden',
        boxShadow:    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
                ✓ {hyvat}/{yht} pistettä tunnistettu
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
        <div style={{ position: 'relative', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img
            ref={imgRef}
            src={kuva.kuva_data}
            alt={nakokulma?.nimi}
            style={{ maxWidth: '90vw', maxHeight: 'calc(90vh - 160px)', objectFit: 'contain', display: 'block' }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position:      'absolute',
              top:           '50%',
              left:          '50%',
              transform:     'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
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
          {onKeypointit ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={naytaLuuranko}
                onChange={(e) => setNaytaLuuranko(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Näytä luuranko
            </label>
          ) : <span />}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
