// KA1 — Asentokuvat. Hoitokäynnin 4 kokovartalokuvaa (edestä/takaa/vasen/oikea).
//
// Kuva otetaan puhelimen / tabletin kameralla (capture="environment") tai
// galleriasta. Pakataan canvas-API:lla ennen DB:hen tallennusta:
//   - max 1200x1600 px (skaalaus jos isompi)
//   - JPEG laatu 0.85
//   - tavoite < 500 KB per kuva
//
// KA2-KA6 lisäävät pose-detection, kulmat, manuaalisen korjauksen ja
// vertailun ilman skeemamuutosta (asentokuvat-taulussa on jo keypointit
// ja kulmat -sarakkeet jsonb-muodossa).

import { useEffect, useRef, useState } from 'react'
import { haeAsentokuvat, tallennaAsentokuva, poistaAsentokuva } from '../lib/db'

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
  const [kuvat, setKuvat] = useState({})  // { edesta: {id, kuva_data, ...}, ... }
  const [lataus, setLataus] = useState(null)  // nakokulma jolle juuri pakataan
  const [valittu, setValittu] = useState(null)  // suurennusmodaalin avain
  const [virhe, setVirhe] = useState(null)

  useEffect(() => {
    if (!hoitokayntiId) return
    let peruttu = false
    haeAsentokuvat(hoitokayntiId).then((rivit) => {
      if (peruttu) return
      const kartalle = {}
      for (const r of rivit) kartalle[r.nakokulma] = r
      setKuvat(kartalle)
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
      setKuvat((prev) => ({ ...prev, [nakokulma]: { ...tulos.kuva, kuva_data: pakattu } }))
    } catch (e) {
      setVirhe(`Kuvan käsittely epäonnistui: ${e.message ?? 'tuntematon'}`)
    } finally {
      setLataus(null)
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
          onSulje={() => setValittu(null)}
          onPoista={() => poista(valittu)}
          onVaihda={(file) => { setValittu(null); kasittelyTiedosto(file, valittu) }}
        />
      )}
    </div>
  )
}

function KuvaSlot({ nakokulma, kuva, onLisaa, onAvaaSuurennus, lataa }) {
  const inputRef = useRef(null)
  const onKuva = !!kuva

  function valitse(e) {
    const file = e.target.files?.[0]
    if (file) onLisaa(file)
    e.target.value = ''  // salli saman tiedoston uudelleenvalinta
  }

  return (
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
  )
}

function SuurennusModaali({ nakokulma, kuva, onSulje, onPoista, onVaihda }) {
  const inputRef = useRef(null)

  function valitse(e) {
    const file = e.target.files?.[0]
    if (file) onVaihda(file)
    e.target.value = ''
  }

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
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>
            {nakokulma?.nimi}
          </h3>
          <button
            type="button"
            onClick={onSulje}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}
          >
            ✕
          </button>
        </div>
        <img
          src={kuva.kuva_data}
          alt={nakokulma?.nimi}
          style={{ maxWidth: '90vw', maxHeight: 'calc(90vh - 100px)', objectFit: 'contain', background: '#000' }}
        />
        <div style={{
          padding:    '10px 16px',
          borderTop:  '1px solid #f3f4f6',
          display:    'flex',
          gap:        '8px',
          justifyContent: 'flex-end',
          flexWrap:   'wrap',
        }}>
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
  )
}
