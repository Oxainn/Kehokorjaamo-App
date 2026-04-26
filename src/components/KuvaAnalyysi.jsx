import { useState, useRef, useEffect } from 'react'

const MITTAUSTYYPIT = {
  hartiat:    { nimi: 'Hartiat',    pistemaara: 2, viite: 'vaaka', vari: '#1D9E75' },
  lantio:     { nimi: 'Lantio',     pistemaara: 2, viite: 'vaaka', vari: '#1D9E75' },
  polvet:     { nimi: 'Polvet',     pistemaara: 2, viite: 'vaaka', vari: '#1D9E75' },
  korvat:     { nimi: 'Korvat',     pistemaara: 2, viite: 'vaaka', vari: '#1D9E75' },
  selkaranka: { nimi: 'Selkäranka', pistemaara: 3, viite: 'pysty', vari: '#185FA5' },
}

function laskeKulma(pisteet, tyyppi) {
  if (pisteet.length === 2) {
    const [p1, p2] = pisteet
    return Math.abs(
      Math.atan2(Math.abs(p2.y - p1.y), Math.abs(p2.x - p1.x)) * 180 / Math.PI
    ).toFixed(1)
  }
  // 3 pistettä: kulmaus p2:ssa (selkäranka)
  const [p1, p2, p3] = pisteet
  const v1  = { x: p1.x - p2.x, y: p1.y - p2.y }
  const v2  = { x: p3.x - p2.x, y: p3.y - p2.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const cr  = v1.x * v2.y - v1.y * v2.x
  return (180 - Math.atan2(Math.abs(cr), dot) * 180 / Math.PI).toFixed(1)
}

export default function KuvaAnalyysi({ asiakasId, onTallenna }) {
  const [tila, setTila]                       = useState('kamera')
  const [kuva, setKuva]                       = useState(null)
  const [pisteet, setPisteet]                 = useState([])
  const [mittaukset, setMittaukset]           = useState([])
  const [valittuTyyppi, setValittuTyyppi]     = useState('hartiat')
  const [nykyinenKulma, setNykyinenKulma]     = useState(null)
  const [vedetäänPistettä, setVedetäänPistettä] = useState(null)
  const [interaktio, setInteraktio]             = useState('piirrä')

  const kanvaasiRef = useRef(null)
  const kameraRef   = useRef(null)
  const galleriRef  = useRef(null)

  const getKoordinaatit = (e) => {
    const canvas = kanvaasiRef.current
    const rect   = canvas.getBoundingClientRect()
    const touch  = e.touches?.[0] ?? e
    return {
      x: (touch.clientX - rect.left) * (canvas.width  / rect.width),
      y: (touch.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  const pisteSäde = () => {
    const canvas = kanvaasiRef.current
    if (!canvas) return 24
    return Math.max(canvas.width, canvas.height) * 0.025
  }

  const piirrä = () => {
    const canvas = kanvaasiRef.current
    if (!canvas || canvas.width === 0) return
    const ctx        = canvas.getContext('2d')
    const PISTE_SÄDE = Math.max(canvas.width, canvas.height) * 0.025
    const fontSize   = Math.round(Math.max(canvas.width, canvas.height) * 0.02)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const piirräViiva = (a, b, vari) => {
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = vari
      ctx.lineWidth   = Math.max(canvas.width, canvas.height) * 0.004
      ctx.stroke()
    }

    const piirräPiste = (p, vari, isDragged = false) => {
      // Ulompi ympyrä
      ctx.beginPath()
      ctx.arc(p.x, p.y, PISTE_SÄDE, 0, Math.PI * 2)
      if (isDragged) {
        ctx.fillStyle = '#EF9F27'
        ctx.fill()
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = vari
        ctx.lineWidth   = PISTE_SÄDE * 0.15
        ctx.stroke()
        // Sisempi ympyrä värillä
        ctx.beginPath()
        ctx.arc(p.x, p.y, PISTE_SÄDE * 0.6, 0, Math.PI * 2)
        ctx.fillStyle = vari
        ctx.fill()
      }
    }

    const piirräLabel = (teksti, x, y) => {
      const pad = fontSize * 0.8
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x - pad * 2, y - pad, pad * 4, pad * 2)
      ctx.fillStyle = '#333'
      ctx.font      = `bold ${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(teksti, x, y + fontSize * 0.35)
    }

    // Tallennetut mittaukset
    mittaukset.forEach(m => {
      const vari = MITTAUSTYYPIT[m.tyyppi]?.vari ?? '#1D9E75'
      const ps   = [m.p1, m.p2, m.p3].filter(Boolean)
      for (let i = 0; i < ps.length - 1; i++) piirräViiva(ps[i], ps[i + 1], vari)
      ps.forEach((p, i) => {
        const isDragged = vedetäänPistettä?.mittausId === m.id &&
                          vedetäänPistettä?.pisteIndex === i
        piirräPiste(p, vari, isDragged)
      })
      if (ps.length >= 2) {
        const last = ps.length - 1
        const mx   = (ps[last - 1].x + ps[last].x) / 2
        const my   = (ps[last - 1].y + ps[last].y) / 2
        piirräLabel(m.kulma + '°', mx, my)
      }
    })

    // Aktiiviset pisteet — aina oranssi, selkeästi erillään tallennetuista
    if (pisteet.length > 0) {
      const vari = MITTAUSTYYPIT[valittuTyyppi]?.vari ?? '#1D9E75'
      for (let i = 0; i < pisteet.length - 1; i++) piirräViiva(pisteet[i], pisteet[i + 1], vari)
      pisteet.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, PISTE_SÄDE, 0, Math.PI * 2)
        ctx.fillStyle = '#EF9F27'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(p.x, p.y, PISTE_SÄDE * 0.6, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      })
    }
  }

  useEffect(() => {
    if (!kuva || !kanvaasiRef.current) return
    const canvas = kanvaasiRef.current
    const img = new Image()
    img.onload = () => {
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      piirrä()
    }
    img.src = kuva
  }, [kuva]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { piirrä() }, [pisteet, mittaukset, vedetäänPistettä]) // eslint-disable-line react-hooks/exhaustive-deps

  const lisääPiste = (x, y) => {
    const pistemaara = MITTAUSTYYPIT[valittuTyyppi].pistemaara
    const uudet      = pisteet.length >= pistemaara ? [{ x, y }] : [...pisteet, { x, y }]
    if (uudet.length < pisteet.length) setNykyinenKulma(null)
    setPisteet(uudet)
    if (uudet.length === pistemaara) {
      setNykyinenKulma(laskeKulma(uudet, valittuTyyppi))
    }
  }

  const onTouchStart = (e) => {
    e.preventDefault()
    const { x, y } = getKoordinaatit(e)
    const osuma     = pisteSäde() * 2

    // Osuuko tallennettuun pisteeseen?
    for (const m of mittaukset) {
      const pisteetArr = [m.p1, m.p2, m.p3].filter(Boolean)
      for (let i = 0; i < pisteetArr.length; i++) {
        const p        = pisteetArr[i]
        const etäisyys = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2)
        if (etäisyys < osuma) {
          setVedetäänPistettä({ mittausId: m.id, pisteIndex: i })
          return
        }
      }
    }

    // Osuuko aktiiviseen pisteeseen?
    for (let i = 0; i < pisteet.length; i++) {
      const p        = pisteet[i]
      const etäisyys = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2)
      if (etäisyys < osuma) {
        setVedetäänPistettä({ mittausId: 'aktiivinen', pisteIndex: i })
        return
      }
    }

    // Uusi piste
    lisääPiste(x, y)
  }

  const onTouchMove = (e) => {
    e.preventDefault()
    if (!vedetäänPistettä) return
    const { x, y } = getKoordinaatit(e)

    if (vedetäänPistettä.mittausId === 'aktiivinen') {
      setPisteet(prev => {
        const newPisteet = prev.map((p, i) =>
          i === vedetäänPistettä.pisteIndex ? { x, y } : p
        )
        const pistemaara = MITTAUSTYYPIT[valittuTyyppi].pistemaara
        if (newPisteet.length === pistemaara) {
          setNykyinenKulma(laskeKulma(newPisteet, valittuTyyppi))
        }
        return newPisteet
      })
    } else {
      setMittaukset(prev => prev.map(m => {
        if (m.id !== vedetäänPistettä.mittausId) return m
        const keys    = ['p1', 'p2', 'p3']
        const key     = keys[vedetäänPistettä.pisteIndex]
        const updated = { ...m, [key]: { x, y } }
        const ps      = [updated.p1, updated.p2, updated.p3].filter(Boolean)
        return { ...updated, kulma: laskeKulma(ps, m.tyyppi) }
      }))
    }
  }

  const onTouchEnd = () => {
    setVedetäänPistettä(null)
  }

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

  const lisääMittaus = () => {
    const pistemaara = MITTAUSTYYPIT[valittuTyyppi].pistemaara
    if (pisteet.length !== pistemaara || nykyinenKulma === null) return
    const [p1, p2, p3] = pisteet
    setMittaukset(prev => [...prev, {
      id:    'k' + Date.now(),
      tyyppi: valittuTyyppi,
      p1, p2,
      ...(p3 ? { p3 } : {}),
      kulma: nykyinenKulma,
      pvm:   new Date().toISOString(),
    }])
    setPisteet([])
    setNykyinenKulma(null)
  }

  const tyhjennäPisteet = () => { setPisteet([]); setNykyinenKulma(null) }

  const tallennaKäyntiin = () => {
    const data = {
      id:        'ka' + Date.now(),
      pvm:       new Date().toISOString(),
      kuva,
      mittaukset,
    }
    const avain   = 'kuva_analyysi_' + (asiakasId || 'testi')
    const aiemmat = JSON.parse(localStorage.getItem(avain) || '[]')
    localStorage.setItem(avain, JSON.stringify([...aiemmat, data]))
    onTallenna?.(data)
    alert('Tallennettu!')
  }

  const aloitaAlusta = () => {
    setKuva(null)
    setPisteet([])
    setMittaukset([])
    setNykyinenKulma(null)
    setTila('kamera')
  }

  const tyyppiObj   = MITTAUSTYYPIT[valittuTyyppi]
  const tarvittavia = tyyppiObj.pistemaara
  const valmis      = pisteet.length === tarvittavia

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
        <div className="flex flex-wrap gap-2">
          {Object.entries(MITTAUSTYYPIT).map(([id, t]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setValittuTyyppi(id); tyhjennäPisteet() }}
              className="py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors"
              style={{
                borderColor:     valittuTyyppi === id ? t.vari : '#e5e7eb',
                backgroundColor: valittuTyyppi === id ? t.vari : 'white',
                color:           valittuTyyppi === id ? 'white' : '#4b5563',
              }}
            >
              {t.nimi}
            </button>
          ))}
        </div>

        {/* Ohjeteksti */}
        <p className="text-sm text-center font-medium"
          style={{ color: valmis ? tyyppiObj.vari : '#6b7280' }}>
          {valmis
            ? `${tyyppiObj.nimi}: ${nykyinenKulma}° ${tyyppiObj.viite === 'vaaka' ? 'vaakalinjasta' : 'kulmaus'}`
            : `Napauta ${tarvittavia} pistettä — ${pisteet.length}/${tarvittavia} merkitty`
          }
        </p>

        {/* Piirrä / Scrollaa -toggle */}
        <div className="flex gap-2">
          {[['piirrä', '✏️ Piirrä'], ['scrollaa', '↕️ Scrollaa']].map(([arvo, label]) => (
            <button
              key={arvo}
              type="button"
              onClick={() => setInteraktio(arvo)}
              className="flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors"
              style={{
                borderColor:     interaktio === arvo ? '#1D9E75' : '#e5e7eb',
                backgroundColor: interaktio === arvo ? '#1D9E75' : 'white',
                color:           interaktio === arvo ? 'white'   : '#4b5563',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Kuva + canvas overlay — scrollattava */}
        <div style={{
          width: '100%', overflowX: 'auto', overflowY: 'auto',
          maxHeight: '70vh', WebkitOverflowScrolling: 'touch',
          borderRadius: '0.75rem', border: '1px solid #e5e7eb',
          background: '#111827', userSelect: 'none',
        }}>
          <div style={{ position: 'relative', minWidth: '100%', display: 'inline-block' }}>
            <img src={kuva} alt="Analysoitava kuva" style={{ display: 'block', width: '100%' }} />
            <canvas
              ref={kanvaasiRef}
              onTouchStart={interaktio === 'piirrä' ? onTouchStart : undefined}
              onTouchMove={interaktio  === 'piirrä' ? onTouchMove  : undefined}
              onTouchEnd={interaktio   === 'piirrä' ? onTouchEnd   : undefined}
              onMouseDown={interaktio  === 'piirrä' ? onTouchStart : undefined}
              onMouseMove={interaktio  === 'piirrä' ? (e) => { if (e.buttons === 1) onTouchMove(e) } : undefined}
              onMouseUp={interaktio    === 'piirrä' ? onTouchEnd   : undefined}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                cursor: interaktio === 'piirrä' ? 'crosshair' : 'default',
                touchAction:   interaktio === 'piirrä' ? 'none' : 'auto',
                pointerEvents: interaktio === 'piirrä' ? 'auto' : 'none',
              }}
            />
          </div>
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
            disabled={!valmis}
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
                const t = MITTAUSTYYPIT[m.tyyppi]
                return (
                  <li key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.vari }} />
                      <span className="text-sm text-gray-700">{t.nimi}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">
                      {m.kulma}° {t.viite === 'vaaka' ? 'vaakalinjasta' : 'kulmaus'}
                    </span>
                  </li>
                )
              })}
            </ul>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setTila('tulos')}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Valmis → Näytä tulokset
              </button>
              <button
                type="button"
                onClick={tallennaKäyntiin}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Tallenna käyntiin ({mittaukset.length} mittausta)
              </button>
            </div>
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

      <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-900">
        <img src={kuva} alt="Analysoitu kuva" className="w-full block" onLoad={piirrä} />
        <canvas ref={kanvaasiRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Mittaustulokset</p>
        {mittaukset.length === 0 ? (
          <p className="text-sm text-gray-400">Ei mittauksia.</p>
        ) : (
          <ul className="flex flex-col">
            {mittaukset.map(m => {
              const t = MITTAUSTYYPIT[m.tyyppi]
              return (
                <li key={m.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.vari }} />
                    <span className="text-sm font-medium text-gray-700">{t.nimi}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold" style={{ color: t.vari }}>{m.kulma}°</span>
                    <span className="text-xs text-gray-400 ml-1.5">
                      {t.viite === 'vaaka' ? 'vaakalinjasta' : 'kulmaus'}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button type="button" onClick={tallennaKäyntiin}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
          Tallenna käyntiin
        </button>
        <button type="button" onClick={aloitaAlusta}
          className="w-full py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Ota uusi kuva
        </button>
      </div>
    </div>
  )
}
