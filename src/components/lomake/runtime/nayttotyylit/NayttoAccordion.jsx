import { useState, useMemo, useEffect } from 'react'
import Osio from '../Osio'

const lahetysTyyli = {
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
}

const containerTyyli = (sisaltaaVirheen) => ({
  background:   'white',
  borderRadius: '16px',
  border:       sisaltaaVirheen ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
  boxShadow:    '0 1px 4px rgba(0,0,0,0.05)',
  overflow:     'hidden',
})

const headerTyyli = (auki, sisaltaaVirheen) => ({
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'space-between',
  padding:      '16px 20px',
  background:   sisaltaaVirheen
                  ? '#fef2f2'
                  : auki
                  ? '#f9fafb'
                  : 'white',
  border:       'none',
  borderBottom: auki ? '1px solid #e5e7eb' : 'none',
  cursor:       'pointer',
  width:        '100%',
  textAlign:    'left',
  userSelect:   'none',
})

const otsikkoTyyli = (sisaltaaVirheen) => ({
  fontSize:   '15px',
  fontWeight: '700',
  color:      sisaltaaVirheen ? '#991b1b' : '#111827',
  margin:     0,
  letterSpacing: '0.02em',
})

const meritsTyyli = (sisaltaaVirheen) => ({
  fontSize:   '12px',
  color:      sisaltaaVirheen ? '#dc2626' : '#9ca3af',
  fontWeight: '500',
})

const nuoliTyyli = (auki) => ({
  fontSize:   '14px',
  color:      '#6b7280',
  transform:  auki ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: 'transform 0.15s',
})

function laskeOsionStatus(osio, vastaukset, kentat, virheet) {
  const yhteensa = (osio.kenttat ?? []).length
  let taytetty = 0
  let virhetta = false
  for (const kf of osio.kenttat ?? []) {
    const t = kf.kentta_id_tunniste
    if (virheet?.[t]) virhetta = true
    const tyyppi = kentat[t]?.tyyppi
    const arvo   = vastaukset?.[t]
    if (arvo === null || arvo === undefined) continue
    if (tyyppi === 'checkbox') { if (arvo === true) taytetty++; continue }
    if (typeof arvo === 'string') { if (arvo.trim() !== '') taytetty++; continue }
    taytetty++
  }
  return { taytetty, yhteensa, sisaltaaVirheen: virhetta }
}

export default function NayttoAccordion({ rakenne, kentat, vastaukset, virheet, onKenttamuutos, onLahetys }) {
  const osiot = useMemo(
    () => (rakenne?.osiot ?? []).slice().sort((a, b) => (a.jarjestys ?? 0) - (b.jarjestys ?? 0)),
    [rakenne]
  )

  // Auki-tila per osio. Oletus: ensimmäinen auki, muut kiinni.
  const [aukiSet, setAukiSet] = useState(() => new Set(osiot.length > 0 ? [osiot[0].id] : []))

  function toggle(osioId) {
    setAukiSet((prev) => {
      const seuraava = new Set(prev)
      if (seuraava.has(osioId)) seuraava.delete(osioId)
      else seuraava.add(osioId)
      return seuraava
    })
  }

  // Pakota auki kaikki osiot joissa on virhe
  useEffect(() => {
    if (!virheet) return
    const virheelliset = []
    for (const osio of osiot) {
      for (const kf of osio.kenttat ?? []) {
        if (virheet[kf.kentta_id_tunniste]) { virheelliset.push(osio.id); break }
      }
    }
    if (virheelliset.length === 0) return
    setAukiSet((prev) => {
      const seuraava = new Set(prev)
      let muuttui = false
      for (const id of virheelliset) {
        if (!seuraava.has(id)) { seuraava.add(id); muuttui = true }
      }
      return muuttui ? seuraava : prev
    })
  }, [virheet, osiot])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {osiot.map((osio) => {
        const otsikko = typeof osio.otsikko === 'object' ? (osio.otsikko.fi ?? osio.id) : (osio.otsikko ?? osio.id)
        const auki = aukiSet.has(osio.id)
        const status = laskeOsionStatus(osio, vastaukset, kentat, virheet)

        return (
          <div key={osio.id} style={containerTyyli(status.sisaltaaVirheen)}>
            <button
              type="button"
              onClick={() => toggle(osio.id)}
              style={headerTyyli(auki, status.sisaltaaVirheen)}
            >
              <p style={otsikkoTyyli(status.sisaltaaVirheen)}>{otsikko}</p>
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={meritsTyyli(status.sisaltaaVirheen)}>
                  {status.sisaltaaVirheen
                    ? 'Puutteita'
                    : `${status.taytetty}/${status.yhteensa} täytetty`}
                </span>
                <span style={nuoliTyyli(auki)}>▼</span>
              </span>
            </button>

            {auki && (
              <div style={{ padding: '20px' }}>
                <Osio
                  osio={osio}
                  kentat={kentat}
                  vastaukset={vastaukset}
                  virheet={virheet}
                  onKenttamuutos={onKenttamuutos}
                  naytaOtsikko={false}
                />
              </div>
            )}
          </div>
        )
      })}

      {onLahetys && (
        <button type="button" onClick={onLahetys} style={lahetysTyyli}>
          LÄHETÄ LOMAKE
        </button>
      )}
    </div>
  )
}
