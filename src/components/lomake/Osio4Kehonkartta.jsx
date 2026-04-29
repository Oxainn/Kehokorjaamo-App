import { useState, useRef, useEffect, useCallback } from 'react'
import { KEHON_VYOHYKKEET } from '../../data/kehonVyohykkeet'

const CANVAS_LEVEYS = 1471
const CANVAS_KORKEUS = 1069
const SIVELLIN_KOKO = 60
const VYOHYKKEEN_SADE = 80

const OIRETYYPIT = [
  { id: 'kipu',          nimi: 'Kipu',          vari: '#ef4444' },
  { id: 'lihasjannitys', nimi: 'Lihasjännitys',  vari: '#f97316' },
  { id: 'puutuminen',    nimi: 'Puutuminen',     vari: '#3b82f6' },
  { id: 'tunnottomuus',  nimi: 'Tunnottomuus',   vari: '#9ca3af' },
]

const HAHMOVAIHTOEHDOT = [
  { id: 'nainen', nimi: 'Nainen' },
  { id: 'mies',   nimi: 'Mies'   },
]

function laskeMerkinnat(vedot) {
  const merkinnat = {}
  for (const veto of vedot) {
    for (const piste of veto.pisteet) {
      for (const vyohyke of KEHON_VYOHYKKEET) {
        const dx = piste.x - vyohyke.cx
        const dy = piste.y - vyohyke.cy
        const etaisyys = Math.sqrt(dx * dx + dy * dy)
        if (etaisyys <= VYOHYKKEEN_SADE) {
          if (!merkinnat[vyohyke.id]) {
            merkinnat[vyohyke.id] = []
          }
          if (!merkinnat[vyohyke.id].includes(veto.oiretyyppi)) {
            merkinnat[vyohyke.id].push(veto.oiretyyppi)
          }
        }
      }
    }
  }
  return merkinnat
}

export default function Osio4Kehonkartta({
  arvo = { merkinnat: {}, vedot: [], kuva: null, hahmo: 'nainen' },
  onMuutos,
}) {
  const [valittuOire, setValittuOire] = useState('kipu')
  const [piirtaa, setPiirtaa] = useState(false)
  const [nykyinenVeto, setNykyinenVeto] = useState(null)

  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const containerRef = useRef(null)

  // Piirrä kaikki vedot canvasille
  const piirraCancas = useCallback((vedot) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_LEVEYS, CANVAS_KORKEUS)

    for (const veto of vedot) {
      if (veto.pisteet.length < 2) continue
      const oire = OIRETYYPIT.find(o => o.id === veto.oiretyyppi)
      if (!oire) continue

      ctx.beginPath()
      ctx.strokeStyle = oire.vari
      ctx.lineWidth = SIVELLIN_KOKO
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = 0.45

      ctx.moveTo(veto.pisteet[0].x, veto.pisteet[0].y)
      for (let i = 1; i < veto.pisteet.length; i++) {
        ctx.lineTo(veto.pisteet[i].x, veto.pisteet[i].y)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }, [])

  // Synkronoi canvas kun vedot muuttuvat ulkoa
  useEffect(() => {
    piirraCancas(arvo.vedot)
  }, [arvo.vedot, piirraCancas])

  // Muunna näyttökoordinaatit canvas-koordinaateiksi
  function canvasKoordinaatit(tapahtuma) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const koskettaja = tapahtuma.touches?.[0] ?? tapahtuma
    const x = ((koskettaja.clientX - rect.left) / rect.width) * CANVAS_LEVEYS
    const y = ((koskettaja.clientY - rect.top) / rect.height) * CANVAS_KORKEUS
    return { x: Math.round(x), y: Math.round(y) }
  }

  function aloitaPiirto(tapahtuma) {
    tapahtuma.preventDefault()
    const piste = canvasKoordinaatit(tapahtuma)
    const uusiVeto = { oiretyyppi: valittuOire, pisteet: [piste] }
    setNykyinenVeto(uusiVeto)
    setPiirtaa(true)
  }

  function jatkaPiirtoa(tapahtuma) {
    if (!piirtaa || !nykyinenVeto) return
    tapahtuma.preventDefault()
    const piste = canvasKoordinaatit(tapahtuma)
    const paivitettyVeto = {
      ...nykyinenVeto,
      pisteet: [...nykyinenVeto.pisteet, piste],
    }
    setNykyinenVeto(paivitettyVeto)

    // Piirrä viimeisin viiva suoraan canvasille
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const oire = OIRETYYPIT.find(o => o.id === valittuOire)
    if (!oire) return

    const pisteet = paivitettyVeto.pisteet
    if (pisteet.length < 2) return
    const edellinen = pisteet[pisteet.length - 2]
    const nykyinen = pisteet[pisteet.length - 1]

    ctx.beginPath()
    ctx.strokeStyle = oire.vari
    ctx.lineWidth = SIVELLIN_KOKO
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.45
    ctx.moveTo(edellinen.x, edellinen.y)
    ctx.lineTo(nykyinen.x, nykyinen.y)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function lopetaPiirto() {
    if (!piirtaa || !nykyinenVeto) return
    setPiirtaa(false)

    const uudetVedot = [...arvo.vedot, nykyinenVeto]
    const uudetMerkinnat = laskeMerkinnat(uudetVedot)

    const canvas = canvasRef.current
    const kuva = canvas ? canvas.toDataURL('image/png') : arvo.kuva

    onMuutos({ ...arvo, vedot: uudetVedot, merkinnat: uudetMerkinnat, kuva })
    setNykyinenVeto(null)
  }

  function kumoa() {
    if (arvo.vedot.length === 0) return
    const uudetVedot = arvo.vedot.slice(0, -1)
    const uudetMerkinnat = laskeMerkinnat(uudetVedot)
    piirraCancas(uudetVedot)

    const canvas = canvasRef.current
    const kuva = canvas ? canvas.toDataURL('image/png') : arvo.kuva

    onMuutos({ ...arvo, vedot: uudetVedot, merkinnat: uudetMerkinnat, kuva })
  }

  function tyhjenna() {
    if (!confirm('Tyhjennä kaikki piirrokset?')) return
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, CANVAS_LEVEYS, CANVAS_KORKEUS)
    }
    onMuutos({ ...arvo, vedot: [], merkinnat: {}, kuva: null })
  }

  const merkkienMaara = Object.keys(arvo.merkinnat).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>

      {/* Hahmo-valinta */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#6b7280', marginRight: '4px' }}>Hahmo:</span>
        {HAHMOVAIHTOEHDOT.map(h => (
          <button
            key={h.id}
            onClick={() => onMuutos({ ...arvo, hahmo: h.id })}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '2px solid',
              borderColor: arvo.hahmo === h.id ? '#185FA5' : '#e5e7eb',
              background: arvo.hahmo === h.id ? '#eff6ff' : 'white',
              color: arvo.hahmo === h.id ? '#185FA5' : '#374151',
              fontSize: '13px',
              fontWeight: arvo.hahmo === h.id ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {h.nimi}
          </button>
        ))}
      </div>

      {/* Oire-valinta */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {OIRETYYPIT.map(oire => (
          <button
            key={oire.id}
            onClick={() => setValittuOire(oire.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '20px',
              border: '2px solid',
              borderColor: valittuOire === oire.id ? oire.vari : '#e5e7eb',
              background: valittuOire === oire.id ? oire.vari + '18' : 'white',
              color: valittuOire === oire.id ? oire.vari : '#6b7280',
              fontSize: '13px',
              fontWeight: valittuOire === oire.id ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: oire.vari,
              flexShrink: 0,
            }} />
            {oire.nimi}
          </button>
        ))}
      </div>

      {/* Piirtoalue */}
      <div
        ref={containerRef}
        style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}
      >
        <img
          ref={imgRef}
          src="/hahmokuvat.svg"
          alt="Kehonkartta"
          style={{ display: 'block', width: '100%', pointerEvents: 'none', userSelect: 'none' }}
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          width={CANVAS_LEVEYS}
          height={CANVAS_KORKEUS}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            touchAction: 'none',
            cursor: 'crosshair',
          }}
          onMouseDown={aloitaPiirto}
          onMouseMove={jatkaPiirtoa}
          onMouseUp={lopetaPiirto}
          onMouseLeave={lopetaPiirto}
          onTouchStart={aloitaPiirto}
          onTouchMove={jatkaPiirtoa}
          onTouchEnd={lopetaPiirto}
        />
      </div>

      {/* Yhteenveto + toimintopainikkeet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#6b7280', flex: 1 }}>
          {merkkienMaara > 0
            ? `${merkkienMaara} vyöhykettä merkitty`
            : 'Ei merkintöjä — piirrä haluamillesi alueille'}
        </span>
        <button
          onClick={kumoa}
          disabled={arvo.vedot.length === 0}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: 'white',
            color: '#374151',
            fontSize: '13px',
            cursor: arvo.vedot.length === 0 ? 'default' : 'pointer',
            opacity: arvo.vedot.length === 0 ? 0.4 : 1,
          }}
        >
          Kumoa
        </button>
        <button
          onClick={tyhjenna}
          disabled={arvo.vedot.length === 0}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #fca5a5',
            background: 'white',
            color: '#dc2626',
            fontSize: '13px',
            cursor: arvo.vedot.length === 0 ? 'default' : 'pointer',
            opacity: arvo.vedot.length === 0 ? 0.4 : 1,
          }}
        >
          Tyhjennä
        </button>
      </div>

      {/* Merkityt vyöhykkeet listana */}
      {merkkienMaara > 0 && (
        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>
            Merkityt alueet
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.entries(arvo.merkinnat).map(([vyohykeId, oiretyypit]) => {
              const vyohyke = KEHON_VYOHYKKEET.find(v => v.id === vyohykeId)
              if (!vyohyke) return null
              return (
                <div
                  key={vyohykeId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                    color: '#374151',
                  }}
                >
                  <span>{vyohyke.nimi}</span>
                  <span style={{ color: '#9ca3af' }}>·</span>
                  {oiretyypit.map(ot => {
                    const oire = OIRETYYPIT.find(o => o.id === ot)
                    return oire ? (
                      <span
                        key={ot}
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: oire.vari,
                          flexShrink: 0,
                        }}
                        title={oire.nimi}
                      />
                    ) : null
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
