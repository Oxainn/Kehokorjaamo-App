import { useState, useRef, useEffect } from 'react'

const MITTAUSTYYPIT = [
  { id: 'lantio',     label: 'Lantio',     viiva: 'vaaka', vari: '#3b82f6' },
  { id: 'hartiat',    label: 'Hartiat',    viiva: 'vaaka', vari: '#f97316' },
  { id: 'selkaranka', label: 'Selkäranka', viiva: 'pysty', vari: '#10b981' },
]

function laskeKulma(p1, p2, viivaTyyppi) {
  const dx = Math.abs(p2.x - p1.x)
  const dy = Math.abs(p2.y - p1.y)
  const asteetVaakalinjasta = Math.atan2(dy, dx) * 180 / Math.PI
  return viivaTyyppi === 'vaaka' ? asteetVaakalinjasta : 90 - asteetVaakalinjasta
}

function tapahtumaKoordinaatit(e, kanvaasi) {
  const rect = kanvaasi.getBoundingClientRect()
  const scaleX = kanvaasi.width / rect.width
  const scaleY = kanvaasi.height / rect.height
  const src = e.touches ? e.touches[0] : e
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top) * scaleY,
  }
}

export default function KuvaAnalyysi({ asiakasId, onTallenna }) {
  const [tila, setTila]                   = useState('kamera')
  const [kuva, setKuva]                   = useState(null)
  const [kuvaKoko, setKuvaKoko]           = useState({ w: 0, h: 0 })
  const [pisteet, setPisteet]             = useState([])
  const [mittaukset, setMittaukset]       = useState([])
  const [valittuTyyppi, setValittuTyyppi] = useState('lantio')
  const [nykyinenKulma, setNykyinenKulma] = useState(null)

  const kanvaasiRef = useRef(null)
  const kameraRef   = useRef(null)
  const galleriRef  = useRef(null)

  // Piirtää canvas aina kun tila, pisteet tai mittaukset muuttuvat
  useEffect(() => {
    const kanvaasi = kanvaasiRef.current
    if (!kanvaasi || kuvaKoko.w === 0) return

    kanvaasi.width  = kuvaKoko.w
    kanvaasi.height = kuvaKoko.h
    const ctx = kanvaasi.getContext('2d')

    const fontSize = Math.max(16, kuvaKoko.w / 45)
    const dotR     = Math.max(10, kuvaKoko.w / 80)
    const lineW    = Math.max(3,  kuvaKoko.w / 250)

    const piirräPiste = (p, vari) => {
      ctx.fillStyle = vari
      ctx.beginPath()
      ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    const piirräViiva = (p1, p2, vari) => {
      ctx.strokeStyle = vari
      ctx.lineWidth = lineW
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }

    const piirräTeksti = (teksti, x, y, vari) => {
      ctx.font      = `bold ${fontSize}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.lineWidth    = fontSize / 4
      ctx.strokeStyle  = 'rgba(0,0,0,0.85)'
      ctx.strokeText(teksti, x, y)
      ctx.fillStyle = vari
      ctx.fillText(teksti, x, y)
    }

    // Tallennetut mittaukset
    mittaukset.forEach(m => {
      const t = MITTAUSTYYPIT.find(x => x.id === m.tyyppi)
      piirräViiva(m.pisteet[0], m.pisteet[1], t.vari)
      piirräPiste(m.pisteet[0], t.vari)
      piirräPiste(m.pisteet[1], t.vari)
      const midX = (m.pisteet[0].x + m.pisteet[1].x) / 2
      const midY = (m.pisteet[0].y + m.pisteet[1].y) / 2
      piirräTeksti(`${t.label}: ${m.kulma.toFixed(1)}°`, midX, midY - dotR - 4, 'white')
    })

    // Nykyinen mittaus käynnissä
    if (tila === 'merkinta') {
      const t = MITTAUSTYYPIT.find(x => x.id === valittuTyyppi)
      pisteet.forEach(p => piirräPiste(p, '#ef4444'))
      if (pisteet.length === 2) {
        piirräViiva(pisteet[0], pisteet[1], t.vari)
      }
    }
  }, [tila, pisteet, mittaukset, valittuTyyppi, kuvaKoko])

  const käsitteleKuvaTiedosto = (e) => {
    const tiedosto = e.target.files?.[0]
    if (!tiedosto) return
    const lukija = new FileReader()
    lukija.onload = ev => {
      setKuva(ev.target.result)
      setPisteet([])
      setMittaukset([])
      setNykyinenKulma(null)
      setTila('merkinta')
    }
    lukija.readAsDataURL(tiedosto)
    e.target.value = ''
  }

  const käsitteleNapautus = (e) => {
    e.preventDefault()
    if (pisteet.length >= 2) return
    const kanvaasi = kanvaasiRef.current
    if (!kanvaasi) return
    const uudet = [...pisteet, tapahtumaKoordinaatit(e, kanvaasi)]
    setPisteet(uudet)
    if (uudet.length === 2) {
      const t = MITTAUSTYYPIT.find(x => x.id === valittuTyyppi)
      setNykyinenKulma(laskeKulma(uudet[0], uudet[1], t.viiva))
    }
  }

  const lisääMittaus = () => {
    if (pisteet.length !== 2 || nykyinenKulma === null) return
    setMittaukset(prev => [...prev, {
      id: Date.now().toString(),
      tyyppi: valittuTyyppi,
      pisteet: [...pisteet],
      kulma: nykyinenKulma,
    }])
    setPisteet([])
    setNykyinenKulma(null)
  }

  const tyhjennäPisteet = () => { setPisteet([]); setNykyinenKulma(null) }

  const tallenna = () => onTallenna?.({
    kuva, mittaukset, aika: new Date().toISOString(), asiakasId,
  })

  const aloitaAlusta = () => {
    setKuva(null)
    setKuvaKoko({ w: 0, h: 0 })
    setPisteet([])
    setMittaukset([])
    setNykyinenKulma(null)
    setTila('kamera')
  }

  const tyyppiObj = MITTAUSTYYPIT.find(t => t.id === valittuTyyppi)

  // ── Vaihe 1: Kamera ────────────────────────────────────────────────────
  if (tila === 'kamera') {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Kuva-analyysi</h3>
          <p className="text-sm text-gray-500 mt-0.5">Ota kuva ja merkitse mittauspisteet</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => kameraRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center gap-3 hover:border-brand-400 hover:bg-brand-50 transition-colors"
          >
            <span className="text-5xl">📷</span>
            <span className="font-semibold text-gray-700">Avaa kamera</span>
            <span className="text-sm text-gray-400">Takakamera aukeaa automaattisesti</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-xs text-gray-400">tai</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => galleriRef.current?.click()}
            className="w-full py-4 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            Valitse kuva galleriasta
          </button>
        </div>

        <input ref={kameraRef}  type="file" accept="image/*" capture="environment" onChange={käsitteleKuvaTiedosto} className="hidden" />
        <input ref={galleriRef} type="file" accept="image/*"                        onChange={käsitteleKuvaTiedosto} className="hidden" />
      </div>
    )
  }

  // ── Vaihe 2: Merkintä ──────────────────────────────────────────────────
  if (tila === 'merkinta') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Merkitse pisteet</h3>
          <button type="button" onClick={aloitaAlusta} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Uusi kuva
          </button>
        </div>

        {/* Mittaustyyppi */}
        <div className="flex gap-2">
          {MITTAUSTYYPIT.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setValittuTyyppi(t.id); tyhjennäPisteet() }}
              className="flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-colors"
              style={{
                borderColor:     valittuTyyppi === t.id ? t.vari : '#e5e7eb',
                backgroundColor: valittuTyyppi === t.id ? t.vari : 'white',
                color:           valittuTyyppi === t.id ? 'white' : '#4b5563',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Ohjeteksti */}
        <p className="text-sm text-center font-medium"
          style={{ color: pisteet.length === 2 ? tyyppiObj.vari : '#6b7280' }}>
          {pisteet.length === 0
            ? 'Napauta kaksi pistettä mittausta varten'
            : pisteet.length === 1
            ? 'Napauta toinen piste'
            : `${tyyppiObj.label}: ${nykyinenKulma?.toFixed(1)}° ${tyyppiObj.viiva === 'vaaka' ? 'vaakalinjasta' : 'pystylinjasta'}`
          }
        </p>

        {/* Kuva + canvas overlay */}
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 select-none bg-gray-900">
          <img
            src={kuva}
            alt="Analysoitava kuva"
            className="w-full block"
            onLoad={e => setKuvaKoko({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
          />
          <canvas
            ref={kanvaasiRef}
            width={kuvaKoko.w || 1}
            height={kuvaKoko.h || 1}
            onClick={käsitteleNapautus}
            onTouchStart={käsitteleNapautus}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            style={{ touchAction: 'manipulation' }}
          />
        </div>

        {/* Toiminnot */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={tyhjennäPisteet}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Uusi mittaus
          </button>
          <button
            type="button"
            onClick={lisääMittaus}
            disabled={pisteet.length !== 2}
            className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            Lisää mittaus
          </button>
        </div>

        {/* Tallennetut mittaukset */}
        {mittaukset.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Tallennetut mittaukset
            </p>
            <ul className="flex flex-col gap-2 mb-3">
              {mittaukset.map(m => {
                const t = MITTAUSTYYPIT.find(x => x.id === m.tyyppi)
                return (
                  <li key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.vari }} />
                      <span className="text-sm text-gray-700">{t.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">
                      {m.kulma.toFixed(1)}° {t.viiva === 'vaaka' ? 'vaakalinjasta' : 'pystylinjasta'}
                    </span>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={() => setTila('tulos')}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Valmis → Näytä tulokset
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Vaihe 3: Tulos ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Tulokset</h3>
        <button type="button" onClick={() => setTila('merkinta')} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Muokkaa
        </button>
      </div>

      {/* Kuva kaikilla viivoilla */}
      <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-900">
        <img src={kuva} alt="Analysoitu kuva" className="w-full block" />
        <canvas
          ref={kanvaasiRef}
          width={kuvaKoko.w || 1}
          height={kuvaKoko.h || 1}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* Mittaustulokset */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Mittaustulokset</p>
        {mittaukset.length === 0 ? (
          <p className="text-sm text-gray-400">Ei mittauksia.</p>
        ) : (
          <ul className="flex flex-col">
            {mittaukset.map(m => {
              const t = MITTAUSTYYPIT.find(x => x.id === m.tyyppi)
              return (
                <li key={m.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.vari }} />
                    <span className="text-sm font-medium text-gray-700">{t.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold" style={{ color: t.vari }}>
                      {m.kulma.toFixed(1)}°
                    </span>
                    <span className="text-xs text-gray-400 ml-1.5">
                      {t.viiva === 'vaaka' ? 'vaakalinjasta' : 'pystylinjasta'}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Toiminnot */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={tallenna}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          Tallenna käyntiin
        </button>
        <button
          type="button"
          onClick={aloitaAlusta}
          className="w-full py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Ota uusi kuva
        </button>
      </div>
    </div>
  )
}
