import { useState } from 'react'
import Kentta from './Kentta'

const containerTyyli = (sisaltaaVirheen) => ({
  background:   '#f9fafb',
  borderRadius: '12px',
  border:       sisaltaaVirheen ? '1.5px solid #fecaca' : '1.5px solid #e5e7eb',
  overflow:     'hidden',
})

const headerTyyli = (auki) => ({
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'space-between',
  padding:      '12px 16px',
  background:   auki ? '#f3f4f6' : 'transparent',
  borderBottom: auki ? '1px solid #e5e7eb' : 'none',
  cursor:       'pointer',
  userSelect:   'none',
})

const otsikkoTyyli = {
  fontSize:   '14px',
  fontWeight: '600',
  color:      '#374151',
  margin:     0,
}

const meritsTyyli = {
  fontSize:   '12px',
  color:      '#9ca3af',
  fontWeight: '500',
}

const nuoliTyyli = (auki) => ({
  fontSize:   '14px',
  color:      '#6b7280',
  transform:  auki ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: 'transform 0.15s',
})

const sisaltoTyyli = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '16px',
  padding:       '16px',
}

function laskeTaytetty(kentat, kentanmerkinnat, vastaukset) {
  let taytetty = 0
  for (const kf of kentanmerkinnat) {
    const arvo = vastaukset?.[kf.kentta_id_tunniste]
    const tyyppi = kentat[kf.kentta_id_tunniste]?.tyyppi
    if (arvo === null || arvo === undefined) continue
    if (tyyppi === 'checkbox') { if (arvo === true) taytetty++; continue }
    if (typeof arvo === 'string') { if (arvo.trim() !== '') taytetty++; continue }
    taytetty++
  }
  return taytetty
}

export default function Ryhma({ ryhma, kentat, kentanmerkinnat, vastaukset, virheet, onKenttamuutos }) {
  const otsikko = typeof ryhma.otsikko === 'object' ? (ryhma.otsikko.fi ?? ryhma.id) : (ryhma.otsikko ?? ryhma.id)

  const sisaltaaVirheen = kentanmerkinnat.some((kf) => virheet?.[kf.kentta_id_tunniste])
  const avattava        = ryhma.avattava !== false

  const [auki, setAuki] = useState(!avattava)
  const naytaAuki = auki || sisaltaaVirheen || !avattava

  const yhteensa = kentanmerkinnat.length
  const taytetty = laskeTaytetty(kentat, kentanmerkinnat, vastaukset)

  return (
    <div style={containerTyyli(sisaltaaVirheen)}>
      {avattava ? (
        <button
          type="button"
          onClick={() => setAuki((p) => !p)}
          style={{ ...headerTyyli(naytaAuki), border: 'none', width: '100%', background: naytaAuki ? '#f3f4f6' : 'transparent', textAlign: 'left' }}
        >
          <p style={otsikkoTyyli}>{otsikko}</p>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={meritsTyyli}>{taytetty}/{yhteensa} täytetty</span>
            <span style={nuoliTyyli(naytaAuki)}>▼</span>
          </span>
        </button>
      ) : (
        <div style={{ ...headerTyyli(true), cursor: 'default' }}>
          <p style={otsikkoTyyli}>{otsikko}</p>
        </div>
      )}

      {naytaAuki && (
        <div style={sisaltoTyyli}>
          {kentanmerkinnat.map((kf) => {
            const tunniste = kf.kentta_id_tunniste
            return (
              <Kentta
                key={tunniste}
                kentta={kentat[tunniste]}
                kenttamerkinta={kf}
                arvo={vastaukset[tunniste]}
                virhe={virheet?.[tunniste]}
                onMuutos={(uusiArvo) => onKenttamuutos(tunniste, uusiArvo)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
