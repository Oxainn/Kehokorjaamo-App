// KA5 — Visuaalinen yhteenveto asentokuvista. Näytetään Hoitokirjauksessa
// Asentokuvat-kortin alapuolella.
//
// Sisältö:
//   1. 4 kuvaa rinnakkain (PC: 4 saraketta, tabletti 2x2, mobiili 1x4)
//      - Keypoint-overlay (luuranko)
//      - Klikkaus avaa lightbox-modaalin
//   2. "Keskeisimmät epätasapainot" -laatikko vakavuusvärein
//   3. Automaattinen tulkintateksti (sääntöpohjainen)
//
// Data tulee KA1-KA4-pinosta — tämä komponentti on read-only.

import { useEffect, useMemo, useRef, useState } from 'react'
import { haeAsentokuvat } from '../lib/db'
import {
  SKELETTI_LINJAT,
  CONFIDENCE_RAJA,
  CONFIDENCE_VARIT,
  luokitaConfidence,
  yhdistaKulmat,
  loydoksetVakavuusjarjestyksessa,
  tulkitseLoydokset,
  arvioiVakavuus,
  VAKAVUUS_VARIT,
  VAKAVUUS_EMOJI,
  KULMA_SELITTEET,
  formatoiKulma,
} from '../lib/poseAnalysis'

const NAKOKULMAT = [
  { id: 'edesta', nimi: 'Edestä' },
  { id: 'takaa',  nimi: 'Takaa' },
  { id: 'vasen',  nimi: 'Vasen sivu' },
  { id: 'oikea',  nimi: 'Oikea sivu' },
]

export default function AsentoYhteenveto({ hoitokayntiId, paivitysAvain }) {
  const [kuvat, setKuvat] = useState({})
  const [valittu, setValittu] = useState(null)
  const [lataa, setLataa] = useState(true)

  useEffect(() => {
    if (!hoitokayntiId) return
    let peruttu = false
    setLataa(true)
    haeAsentokuvat(hoitokayntiId).then((rivit) => {
      if (peruttu) return
      const kartalle = {}
      for (const r of rivit) {
        const raw = r.keypointit
        let nyk = null, ai = null
        if (Array.isArray(raw)) { nyk = raw; ai = raw }
        else if (raw && typeof raw === 'object') {
          nyk = raw.nykyiset ?? raw.ai ?? null
          ai  = raw.ai ?? raw.nykyiset ?? null
        }
        kartalle[r.nakokulma] = { ...r, keypointit: nyk, ai_keypointit: ai }
      }
      setKuvat(kartalle)
      setLataa(false)
    })
    return () => { peruttu = true }
    // paivitysAvain saa parent-komponentin pakottamaan refreshin kun KA1-4
    // muuttaa kuvia. Esim. uuden kuvan oton jälkeen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoitokayntiId, paivitysAvain])

  const kuviaKpl = Object.values(kuvat).filter((k) => k?.kuva_data).length
  const yhdistetyt = useMemo(() => yhdistaKulmat(kuvat), [kuvat])
  const loydokset = useMemo(
    () => loydoksetVakavuusjarjestyksessa(yhdistetyt, 8),
    [yhdistetyt],
  )
  const tulkinta = useMemo(() => tulkitseLoydokset(yhdistetyt), [yhdistetyt])

  if (!hoitokayntiId) return null
  if (lataa) {
    return (
      <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
        Ladataan yhteenvetoa…
      </p>
    )
  }
  if (kuviaKpl === 0) {
    return (
      <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
        Yhteenveto ilmestyy tähän kun kuvat on otettu.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Kuvat 4-grid */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap:                 '10px',
      }}>
        {NAKOKULMAT.map((n) => (
          <YhteenvetoSlot
            key={n.id}
            nakokulma={n}
            kuva={kuvat[n.id]}
            onAvaa={() => kuvat[n.id]?.kuva_data && setValittu(n.id)}
          />
        ))}
      </div>

      {/* Keskeisimmät epätasapainot */}
      <div style={{
        background:    'white',
        border:        '1px solid #e5e7eb',
        borderRadius:  '10px',
        padding:       '12px 14px',
      }}>
        <h4 style={{
          fontSize:      '12px',
          fontWeight:    700,
          color:         '#374151',
          margin:        '0 0 10px 0',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Keskeisimmät epätasapainot
        </h4>
        {loydokset.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
            Ei riittävästi mittausdataa — tarkista että kuvat on otettu kaikista neljästä näkökulmasta.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {loydokset.map((l) => (
              <LoydosRivi key={l.avain} loydos={l} />
            ))}
          </div>
        )}
      </div>

      {/* Tulkintateksti */}
      <div style={{
        background:    '#eff6ff',
        border:        '1px solid #bfdbfe',
        borderRadius:  '10px',
        padding:       '10px 14px',
        fontSize:      '13px',
        color:         '#1e3a8a',
        lineHeight:    1.55,
      }}>
        {tulkinta}
      </div>

      {valittu && kuvat[valittu] && (
        <Lightbox
          nakokulma={NAKOKULMAT.find((n) => n.id === valittu)}
          kuva={kuvat[valittu]}
          onSulje={() => setValittu(null)}
        />
      )}
    </div>
  )
}

function YhteenvetoSlot({ nakokulma, kuva, onAvaa }) {
  const onKuva = !!kuva?.kuva_data
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div
        onClick={onAvaa}
        style={{
          position:      'relative',
          aspectRatio:   '3/4',
          background:    onKuva ? 'transparent' : '#f9fafb',
          border:        onKuva ? '1px solid #e5e7eb' : '1px dashed #d1d5db',
          borderRadius:  '10px',
          cursor:        onKuva ? 'pointer' : 'default',
          overflow:      'hidden',
        }}
      >
        {onKuva ? (
          <KuvaLuurangolla kuva={kuva} alt={nakokulma.nimi} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', color: '#9ca3af',
          }}>
            ei kuvaa
          </div>
        )}
      </div>
      <span style={{
        fontSize:      '11px',
        fontWeight:    600,
        color:         '#6b7280',
        textAlign:     'center',
        letterSpacing: '0.05em',
      }}>
        {nakokulma.nimi}
      </span>
    </div>
  )
}

// Pikkukuva keypoint-overlayllä. Canvas piirretään kun kuva on ladattu;
// koko seuraa kuvaa ResizeObserverin kautta.
export function KuvaLuurangolla({ kuva, alt }) {
  const onKp = !!kuva?.keypointit?.length
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img
        src={kuva.kuva_data}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        draggable={false}
      />
      {onKp && <LuurankoOverlay kuva={kuva} />}
    </div>
  )
}

function LuurankoOverlay({ kuva }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const parent = canvas.parentElement
    const img = parent?.querySelector('img')
    if (!img) return
    const piirra = () => piirraOverlay(canvas, img, kuva.keypointit)
    if (img.complete && img.naturalWidth > 0) piirra()
    else img.addEventListener('load', piirra, { once: true })
    const ro = new ResizeObserver(piirra)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [kuva.keypointit])
  return (
    <canvas
      ref={ref}
      style={{
        position:      'absolute',
        top:           0,
        left:          0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
      }}
    />
  )
}

// Pikkukuvaan optimoitu piirros: ohuemmat linjat, pienemmät pisteet.
// objectFit: cover venyttää kuvaa että se täyttää alueen — mukautuu siten
// että keypointit (luonnon-koordinaateissa) skaalataan suhteessa parent-
// alueen kokoon ja position-mukaan.
function piirraOverlay(canvas, img, keypointit) {
  if (!canvas || !img || !keypointit?.length) return
  const parent = canvas.parentElement
  if (!parent) return
  const rect = parent.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // objectFit: cover laskelmat — selvitä kuinka image renderöityy parentissa
  const imgAR    = img.naturalWidth / img.naturalHeight
  const parentAR = rect.width / rect.height
  let displayW, displayH, offsetX, offsetY
  if (imgAR > parentAR) {
    // Image leveämpi → täytetään korkeus, leikataan sivuilta
    displayH = rect.height
    displayW = rect.height * imgAR
    offsetX  = (rect.width - displayW) / 2
    offsetY  = 0
  } else {
    displayW = rect.width
    displayH = rect.width / imgAR
    offsetX  = 0
    offsetY  = (rect.height - displayH) / 2
  }
  const sx = displayW / img.naturalWidth
  const sy = displayH / img.naturalHeight

  const kpMap = {}
  for (const kp of keypointit) kpMap[kp.name] = kp

  // Luuranko ohut viiva
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 3
  for (const [a, b] of SKELETTI_LINJAT) {
    const pa = kpMap[a]
    const pb = kpMap[b]
    if (!pa || !pb) continue
    if (pa.score < CONFIDENCE_RAJA || pb.score < CONFIDENCE_RAJA) continue
    ctx.beginPath()
    ctx.moveTo(offsetX + pa.x * sx, offsetY + pa.y * sy)
    ctx.lineTo(offsetX + pb.x * sx, offsetY + pb.y * sy)
    ctx.stroke()
  }
  ctx.shadowBlur = 0

  // Pisteet pienemmät pikkukuvassa
  for (const kp of keypointit) {
    const luokka = luokitaConfidence(kp.score)
    const vari = CONFIDENCE_VARIT[luokka]
    ctx.beginPath()
    ctx.arc(offsetX + kp.x * sx, offsetY + kp.y * sy, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = vari
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'white'
    ctx.stroke()
  }
}

function LoydosRivi({ loydos }) {
  const sel = KULMA_SELITTEET[loydos.avain]
  const formatoitu = formatoiKulma(loydos.avain, loydos.arvo)
  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        '8px',
      padding:    '4px 0',
      fontSize:   '12px',
    }}>
      <span style={{ fontSize: '14px' }}>{VAKAVUUS_EMOJI[loydos.vakavuus]}</span>
      <span style={{ color: '#374151', fontWeight: 600, minWidth: '170px' }}>
        {sel.otsikko}:
      </span>
      <span style={{ color: VAKAVUUS_VARIT[loydos.vakavuus], fontWeight: 600 }}>
        {formatoitu}
      </span>
    </div>
  )
}

function Lightbox({ nakokulma, kuva, onSulje }) {
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
        background: '#000', borderRadius: '12px', overflow: 'hidden',
        position: 'relative', maxWidth: '90vw', maxHeight: '90vh',
      }}>
        <button
          type="button"
          onClick={onSulje}
          style={{
            position:    'absolute',
            top:         '8px',
            right:       '8px',
            background:  'rgba(0,0,0,0.6)',
            border:      'none',
            color:       'white',
            cursor:      'pointer',
            fontSize:    '20px',
            width:       '32px',
            height:      '32px',
            borderRadius: '50%',
            zIndex:      1,
          }}
        >
          ✕
        </button>
        <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
          <KuvaLuurangollaContain kuva={kuva} alt={nakokulma?.nimi} />
        </div>
      </div>
    </div>
  )
}

// objectFit: contain -versio (lightbox)
function KuvaLuurangollaContain({ kuva, alt }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img
        src={kuva.kuva_data}
        alt={alt}
        style={{ display: 'block', maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
      />
      {kuva.keypointit?.length && <LuurankoContainOverlay kuva={kuva} />}
    </div>
  )
}

function LuurankoContainOverlay({ kuva }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const img = canvas.parentElement?.querySelector('img')
    if (!img) return
    const piirra = () => {
      const rect = img.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const sx = rect.width / img.naturalWidth
      const sy = rect.height / img.naturalHeight
      const kpMap = {}
      for (const kp of kuva.keypointit) kpMap[kp.name] = kp
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
      for (const kp of kuva.keypointit) {
        const luokka = luokitaConfidence(kp.score)
        const vari = CONFIDENCE_VARIT[luokka]
        ctx.beginPath()
        ctx.arc(kp.x * sx, kp.y * sy, 5, 0, Math.PI * 2)
        ctx.fillStyle = vari
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = 'white'
        ctx.stroke()
      }
    }
    if (img.complete && img.naturalWidth > 0) piirra()
    else img.addEventListener('load', piirra, { once: true })
    const ro = new ResizeObserver(piirra)
    ro.observe(img)
    return () => ro.disconnect()
  }, [kuva.keypointit])
  return (
    <canvas
      ref={ref}
      style={{
        position:      'absolute',
        top:           0,
        left:          0,
        pointerEvents: 'none',
      }}
    />
  )
}

