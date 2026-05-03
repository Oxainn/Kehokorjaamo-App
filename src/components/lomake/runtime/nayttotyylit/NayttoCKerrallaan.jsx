import { useState, useEffect, useMemo } from 'react'
import { useSwipeable } from 'react-swipeable'
import Osio from '../Osio'
import { osionReunaTyyli, RooliTunniste } from '../roolitransitio'

const pisteTyyli = (aktiivinen, sisaltaaVirheen, valmis) => ({
  width:        '28px',
  height:       '28px',
  borderRadius: '50%',
  border:       sisaltaaVirheen
                  ? '2px solid #EF4444'
                  : aktiivinen
                  ? '3px solid #185FA5'
                  : valmis
                  ? '2px solid #1D9E75'
                  : '2px solid #d1d5db',
  background:   sisaltaaVirheen
                  ? '#fef2f2'
                  : aktiivinen
                  ? '#185FA5'
                  : valmis
                  ? '#E1F5EE'
                  : 'white',
  cursor:       'pointer',
  padding:      0,
  flexShrink:   0,
  transition:   'all 0.15s',
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'center',
})

const sisapilkkuTyyli = {
  width:        '8px',
  height:       '8px',
  borderRadius: '50%',
  background:   'white',
}

const otsikkoTyyli = {
  fontSize:     '18px',
  fontWeight:   '700',
  color:        '#111827',
  margin:       0,
  letterSpacing: '0.03em',
  textAlign:    'center',
}

const alaotsikkoTyyli = {
  fontSize: '12px',
  color:    '#9ca3af',
  margin:   0,
}

// Pyöreä nuolinappi — 44x44 + ympärillä margin antaa ≥48px kosketusalueen.
const nuoliNappiTyyli = (piilossa) => ({
  width:          '44px',
  height:         '44px',
  borderRadius:   '50%',
  border:         '2px solid #e2e8f0',
  background:     'white',
  color:          '#374151',
  fontSize:       '20px',
  fontWeight:     '500',
  cursor:         piilossa ? 'default' : 'pointer',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  visibility:     piilossa ? 'hidden' : 'visible',
  flexShrink:     0,
  padding:        0,
  margin:         '0 2px',
  transition:     'all 0.15s',
  lineHeight:     1,
})

const ylanavTyyli = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  gap:            '12px',
  paddingBottom:  '4px',
}

const lahetaTyyli = {
  width:        '100%',
  minHeight:    '52px',
  borderRadius: '12px',
  border:       'none',
  background:   '#1D9E75',
  color:        'white',
  fontSize:     '15px',
  fontWeight:   '700',
  letterSpacing: '0.03em',
  cursor:       'pointer',
  marginTop:    '4px',
}

export default function NayttoCKerrallaan({ rakenne, kentat, vastaukset, virheet, onKenttamuutos, onLahetys }) {
  const osiot = useMemo(
    () => (rakenne?.osiot ?? []).slice().sort((a, b) => (a.jarjestys ?? 0) - (b.jarjestys ?? 0)),
    [rakenne]
  )

  const [nykyinen, setNykyinen] = useState(0)

  // Tarkistus: mitkä osiot sisältävät virheellisen kentän
  const osionVirhe = useMemo(() => {
    const virheelliset = new Set()
    if (!virheet) return virheelliset
    for (let i = 0; i < osiot.length; i++) {
      for (const kf of osiot[i].kenttat ?? []) {
        if (virheet[kf.kentta_id_tunniste]) { virheelliset.add(i); break }
      }
    }
    return virheelliset
  }, [osiot, virheet])

  // Lähetyksen jälkeen: hyppää ensimmäiselle virheelliselle osiolle, jos nykyinen on kunnossa
  useEffect(() => {
    if (osionVirhe.size === 0) return
    if (osionVirhe.has(nykyinen)) return
    const ensimmainen = [...osionVirhe].sort((a, b) => a - b)[0]
    setNykyinen(ensimmainen)
  }, [osionVirhe, nykyinen])

  // Pidä nykyinen-indeksi rajoissa jos rakenne muuttuu
  useEffect(() => {
    if (nykyinen >= osiot.length) setNykyinen(0)
  }, [osiot, nykyinen])

  if (osiot.length === 0) {
    return <p style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center', padding: '32px' }}>Pohja ei sisällä osioita.</p>
  }

  const osio        = osiot[nykyinen]
  const otsikko     = typeof osio.otsikko === 'object' ? (osio.otsikko.fi ?? osio.id) : (osio.otsikko ?? osio.id)
  const rooli       = osio.rooli === 'hoitaja' ? 'hoitaja' : 'asiakas'
  const ekassa      = nykyinen === 0
  const viimeisessa = nykyinen === osiot.length - 1

  function edellinen() { if (!ekassa) setNykyinen((n) => n - 1) }
  function seuraava()  { if (!viimeisessa) setNykyinen((n) => n + 1) }

  const swipeHandlers = useSwipeable({
    onSwipedLeft:        seuraava,
    onSwipedRight:       edellinen,
    delta:               80,
    preventScrollOnSwipe: true,
    trackMouse:          false,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Ylänavigaatio: edellinen | pisteet | seuraava */}
      <div style={ylanavTyyli}>
        <button
          type="button"
          onClick={edellinen}
          disabled={ekassa}
          aria-label="Edellinen osio"
          style={nuoliNappiTyyli(ekassa)}
        >
          ←
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {osiot.map((o, i) => {
            const aktiivinen = i === nykyinen
            const sisaltaaVirheen = osionVirhe.has(i)
            const valmis = i < nykyinen && !sisaltaaVirheen
            const otsikkoNayttoon = typeof o.otsikko === 'object' ? (o.otsikko.fi ?? o.id) : (o.otsikko ?? o.id)
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setNykyinen(i)}
                aria-label={`Osio ${i + 1}: ${otsikkoNayttoon}`}
                style={pisteTyyli(aktiivinen, sisaltaaVirheen, valmis)}
              >
                {aktiivinen && <div style={sisapilkkuTyyli} />}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={seuraava}
          disabled={viimeisessa}
          aria-label="Seuraava osio"
          style={nuoliNappiTyyli(viimeisessa)}
        >
          →
        </button>
      </div>

      {/* Otsikko keskitettynä + rooli-tunniste (AB-T2c) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <p style={alaotsikkoTyyli}>Osio {nykyinen + 1}/{osiot.length}</p>
        <h2 style={otsikkoTyyli}>{otsikko.toUpperCase()}</h2>
        <RooliTunniste rooli={rooli} />
      </div>

      {/* Sisältö + pyyhkäisy */}
      <div
        {...swipeHandlers}
        style={{
          background:    'white',
          borderRadius:  '16px',
          border:        '1px solid #e2e8f0',
          ...osionReunaTyyli(rooli),
          boxShadow:     '0 1px 4px rgba(0,0,0,0.05)',
          padding:       '24px',
          minHeight:     '50vh',
          userSelect:    'text',
        }}
      >
        <Osio
          osio={osio}
          kentat={kentat}
          vastaukset={vastaukset}
          virheet={virheet}
          onKenttamuutos={onKenttamuutos}
          naytaOtsikko={false}
        />
      </div>

      {/* Lähetys-painike vain viimeisellä osiolla, sisällön alapuolella */}
      {viimeisessa && onLahetys && (
        <button type="button" onClick={onLahetys} style={lahetaTyyli}>
          LÄHETÄ LOMAKE ✓
        </button>
      )}
    </div>
  )
}
