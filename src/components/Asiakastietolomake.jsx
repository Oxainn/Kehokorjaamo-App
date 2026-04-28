import { useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import Osio1Asiakastiedot from './lomakkeen-osiot/Osio1Asiakastiedot'
import Osio2Sairaudet from './lomakkeen-osiot/Osio2Sairaudet'

const OSIOT = [
  { numero: 1, otsikko: 'ASIAKASTIEDOT' },
  { numero: 2, otsikko: 'SAIRAUDET JA TERVEYS' },
  { numero: 3, otsikko: 'HOITOON TULON SYY' },
  { numero: 4, otsikko: 'ASIAKKAAN KEHONKARTTA' },
  { numero: 5, otsikko: 'SUOSTUMUKSET' },
]

export default function Asiakastietolomake({ asiakas, hoitajaId }) {
  const [nykyinenOsio, setNykyinenOsio] = useState(1)
  const [nykyinenAsiakas, setNykyinenAsiakas] = useState(asiakas)

  const siirrySeuraavaan = () => {
    if (nykyinenOsio < OSIOT.length) setNykyinenOsio(n => n + 1)
  }
  const siirryEdelliseen = () => {
    if (nykyinenOsio > 1) setNykyinenOsio(n => n - 1)
  }

  const swipeHandlers = useSwipeable({
    onSwipedLeft:         siirrySeuraavaan,
    onSwipedRight:        siirryEdelliseen,
    delta:                80,
    preventScrollOnSwipe: true,
    trackMouse:           false,
  })

  const osio = OSIOT[nykyinenOsio - 1]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── YLÄOSA: pisteet + otsikot ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', paddingBottom: '4px' }}>

        {/* Pisteet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {OSIOT.map(o => {
            const aktiivinen = o.numero === nykyinenOsio
            return (
              <button
                key={o.numero}
                onClick={() => setNykyinenOsio(o.numero)}
                aria-label={`Osio ${o.numero}: ${o.otsikko}`}
                style={{
                  width:          '28px',
                  height:         '28px',
                  borderRadius:   '50%',
                  border:         aktiivinen ? '3px solid #185FA5' : '2px solid #d1d5db',
                  background:     aktiivinen ? '#185FA5' : 'white',
                  cursor:         'pointer',
                  padding:        0,
                  flexShrink:     0,
                  transition:     'all 0.15s',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                }}
              >
                {aktiivinen && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Alaotsikko */}
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
          Asiakastietolomake — Osio {nykyinenOsio}/5
        </p>

        {/* Iso otsikko */}
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0, letterSpacing: '0.03em', textAlign: 'center' }}>
          {osio.otsikko}
        </h2>
      </div>

      {/* ── KESKIOSA: sisältö + pyyhkäisy ─────────────────────────────── */}
      <div
        {...swipeHandlers}
        style={{
          minHeight:      '60vh',
          background:     'white',
          borderRadius:   '16px',
          border:         '1px solid #e2e8f0',
          boxShadow:      '0 1px 4px rgba(0,0,0,0.05)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '32px',
          userSelect:     'none',
        }}
      >
        {nykyinenOsio === 1 ? (
          <div style={{ width: '100%', alignSelf: 'flex-start' }}>
            <Osio1Asiakastiedot
              asiakas={nykyinenAsiakas}
              hoitajaId={hoitajaId}
              onTallennettu={setNykyinenAsiakas}
            />
          </div>
        ) : nykyinenOsio === 2 ? (
          <div style={{ width: '100%', alignSelf: 'flex-start' }}>
            <Osio2Sairaudet
              asiakas={nykyinenAsiakas}
              hoitajaId={hoitajaId}
            />
          </div>
        ) : (
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            Osion {nykyinenOsio} sisältö — tulossa
          </p>
        )}
      </div>

      {/* ── ALAOSA: nuolinapit ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
        <button
          onClick={siirryEdelliseen}
          disabled={nykyinenOsio === 1}
          style={{
            flex:         1,
            minHeight:    '48px',
            borderRadius: '12px',
            border:       '2px solid #e2e8f0',
            background:   'white',
            color:        '#374151',
            fontSize:     '14px',
            fontWeight:   '600',
            cursor:       nykyinenOsio === 1 ? 'default' : 'pointer',
            opacity:      nykyinenOsio === 1 ? 0.4 : 1,
            transition:   'opacity 0.15s',
          }}
        >
          ◄ EDELLINEN
        </button>
        <button
          onClick={siirrySeuraavaan}
          disabled={nykyinenOsio === OSIOT.length}
          style={{
            flex:         1,
            minHeight:    '48px',
            borderRadius: '12px',
            border:       '2px solid transparent',
            background:   nykyinenOsio === OSIOT.length ? 'white' : '#1D9E75',
            borderColor:  nykyinenOsio === OSIOT.length ? '#e2e8f0' : 'transparent',
            color:        nykyinenOsio === OSIOT.length ? '#374151' : 'white',
            fontSize:     '14px',
            fontWeight:   '600',
            cursor:       nykyinenOsio === OSIOT.length ? 'default' : 'pointer',
            opacity:      nykyinenOsio === OSIOT.length ? 0.4 : 1,
            transition:   'all 0.15s',
          }}
        >
          SEURAAVA ►
        </button>
      </div>

    </div>
  )
}
