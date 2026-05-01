// Vaihe B Pala B3+B4 — yksittäisen linjausmittarin liukusäädin.
//
// Props:
//   mittari        — määritys src/data/linjausmittarit.js:stä
//   arvo           — null tai numero (NULL = ei mitattu)
//   onMuutos       — callback (uusiArvo: number | null) => void
//   edellinenArvo  — Pala B4: edellisen käynnin arvo (null jos ei ole)
//   onAiempiKaynti — Pala B4: true jos asiakkaalla oli aiempi käynti
//                    (näyttää "ei mittausta edell." vs. ei tekstiä lainkaan)
//
// UI:
//   - Otsikkorivi: nimi + nykyinen arvo + Tyhjennä-nappi
//   - HTML range-slider min..max askeleella step
//   - min/max-tekstit alla, normaalin kuvaus keskellä
//   - Visuaalinen normaalialue (vihreä viiva radan päällä)
//   - Keltainen "⚠" jos arvo on poikkeava
//   - Pala B4: edellinen arvo + delta + parannus/heikennys-tulkinta

import { arvoNormaalialueella } from '../data/linjausmittarit'
import { laskeMuutos, muotoileDelta } from '../lib/mittaukset'

const containerTyyli = (poikkeava) => ({
  background:   poikkeava ? '#fffbeb' : '#f9fafb',
  border:       poikkeava ? '1.5px solid #fbbf24' : '1px solid #e5e7eb',
  borderRadius: '12px',
  padding:      '14px 16px',
  display:      'flex',
  flexDirection: 'column',
  gap:          '10px',
})

const ylariviTyyli = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  gap:            '12px',
  flexWrap:       'wrap',
}

const otsikkoTyyli = {
  fontSize:    '14px',
  fontWeight:  600,
  color:       '#374151',
  margin:      0,
  display:     'flex',
  alignItems:  'center',
  gap:         '6px',
}

const arvoTyyli = (poikkeava) => ({
  fontSize:    '15px',
  fontWeight:  700,
  color:       poikkeava ? '#92400e' : '#1D9E75',
  fontVariantNumeric: 'tabular-nums',
})

const tyhjennaTyyli = {
  fontSize:     '12px',
  color:        '#6b7280',
  background:   'white',
  border:       '1px solid #e2e8f0',
  borderRadius: '8px',
  padding:      '4px 10px',
  cursor:       'pointer',
}

const sliderTyyli = {
  width:       '100%',
  accentColor: '#1D9E75',
  height:      '8px',
  margin:      '8px 0 0',
}

const ohjerivinTyyli = {
  display:        'flex',
  justifyContent: 'space-between',
  fontSize:       '11px',
  color:          '#9ca3af',
  margin:         0,
}

// Visuaalinen normaalialue radan päällä (gradient-teksti — yksinkertainen)
function normaaliKuvaus(mittari) {
  const n = mittari.normaali
  if (!n) return null
  if (n.kuvaus) return `Normaali: ${n.kuvaus}`
  if (n.arvo !== undefined) return `Normaali: ${n.arvo} ${mittari.yksikko}`
  if (n.min !== undefined && n.max !== undefined) return `Normaali: ${n.min}–${n.max} ${mittari.yksikko}`
  if (n.min !== undefined) return `Normaali: ≥ ${n.min} ${mittari.yksikko}`
  if (n.max !== undefined) return `Normaali: ≤ ${n.max} ${mittari.yksikko}`
  return null
}

// Visuaalinen vihreä alue normaalialueesta — leveys% ja vasen-offset%
function normaaliAlue(mittari) {
  const n = mittari.normaali
  if (!n) return null
  const valitan = mittari.max - mittari.min
  if (valitan <= 0) return null
  let nMin = mittari.min
  let nMax = mittari.max
  if (n.arvo !== undefined) {
    const tol = valitan * 0.05
    nMin = n.arvo - tol
    nMax = n.arvo + tol
  } else {
    if (n.min !== undefined) nMin = n.min
    if (n.max !== undefined) nMax = n.max
  }
  const left  = ((nMin - mittari.min) / valitan) * 100
  const width = ((nMax - nMin) / valitan) * 100
  return { left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` }
}

export default function MittariSliideri({ mittari, arvo, onMuutos, edellinenArvo = null, onAiempiKaynti = false }) {
  const onMitattu = arvo !== null && arvo !== undefined
  const poikkeava = onMitattu && !arvoNormaalialueella(mittari, arvo)
  const normaaliKuv = normaaliKuvaus(mittari)
  const alue = normaaliAlue(mittari)
  // Keskellä rataa visualisoinnin lähtökohta jos arvoa ei vielä ole
  const sliderArvo = onMitattu ? arvo : (mittari.min + mittari.max) / 2

  // Pala B4 — vertailu edelliseen
  const onEdellinen = edellinenArvo !== null && edellinenArvo !== undefined
  const muutos = onMitattu && onEdellinen
    ? laskeMuutos(arvo, edellinenArvo, mittari.sarake)
    : null
  const muutosVari = muutos?.parannus === 'parannus' ? '#15803d'
                  :  muutos?.parannus === 'heikennys' ? '#b91c1c'
                  :  '#6b7280'
  const muutosTeksti = muutos?.parannus === 'parannus' ? 'parannus 🟢'
                    :  muutos?.parannus === 'heikennys' ? 'heikennys 🔴'
                    :  muutos?.parannus === 'ennallaan' ? 'ei muutosta'
                    :  null

  return (
    <div style={containerTyyli(poikkeava)}>
      <div style={ylariviTyyli}>
        <p style={otsikkoTyyli}>
          {mittari.nimi}
          {poikkeava && (
            <span title="Arvo poikkeaa normaalista" style={{ fontSize: '14px' }}>⚠️</span>
          )}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={arvoTyyli(poikkeava)}>
            {onMitattu ? `${arvo} ${mittari.yksikko}` : 'Ei mitattu'}
          </span>
          {onMitattu && (
            <button type="button" onClick={() => onMuutos(null)} style={tyhjennaTyyli}>
              Tyhjennä
            </button>
          )}
        </div>
      </div>

      {/* Rata + visuaalinen normaalialue */}
      <div style={{ position: 'relative', padding: '4px 0' }}>
        {alue && (
          <div style={{
            position:     'absolute',
            top:          'calc(50% + 4px)',
            transform:    'translateY(-50%)',
            left:         alue.left,
            width:        alue.width,
            height:       '6px',
            background:   '#86efac',
            borderRadius: '3px',
            opacity:      0.55,
            pointerEvents: 'none',
          }} />
        )}
        <input
          type="range"
          min={mittari.min}
          max={mittari.max}
          step={mittari.step ?? 1}
          value={sliderArvo}
          onChange={(e) => onMuutos(Number(e.target.value))}
          style={{ ...sliderTyyli, position: 'relative', zIndex: 1 }}
          aria-label={mittari.nimi}
        />
      </div>

      <div style={ohjerivinTyyli}>
        <span>{mittari.min} {mittari.yksikko}</span>
        {normaaliKuv && (
          <span style={{ color: poikkeava ? '#92400e' : '#15803d' }}>
            {normaaliKuv}
          </span>
        )}
        <span>{mittari.max} {mittari.yksikko}</span>
      </div>

      {/* Pala B4 — edellisen käynnin arvo + delta-tulkinta */}
      {(onEdellinen || onAiempiKaynti) && (
        <div style={{
          fontSize:    '12px',
          color:       '#6b7280',
          marginTop:   '4px',
          paddingTop:  '8px',
          borderTop:   '1px dashed #e5e7eb',
          display:     'flex',
          alignItems:  'center',
          gap:         '8px',
          flexWrap:    'wrap',
        }}>
          {onEdellinen ? (
            <>
              <span>edell. <strong style={{ color: '#374151' }}>{edellinenArvo} {mittari.yksikko}</strong></span>
              {muutos && (
                <span style={{ color: muutosVari, fontWeight: 600 }}>
                  → {muotoileDelta(muutos.delta, mittari.yksikko)}
                  {muutosTeksti && <span style={{ marginLeft: '4px', fontWeight: 500 }}>{muutosTeksti}</span>}
                </span>
              )}
            </>
          ) : (
            <span style={{ fontStyle: 'italic' }}>ei mittausta edell.</span>
          )}
        </div>
      )}
    </div>
  )
}
