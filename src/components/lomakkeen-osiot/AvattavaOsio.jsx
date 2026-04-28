import { useState } from 'react'

export default function AvattavaOsio({ otsikko, tila, tilaVihrea, varoitus = false, children }) {
  const [auki, setAuki] = useState(false)

  const ulkoraja   = varoitus ? '1.5px solid #fcd34d' : '1.5px solid #e2e8f0'
  const headerBg   = varoitus
    ? (auki ? '#fffbeb' : '#fffef7')
    : (auki ? '#f8fafc' : 'white')
  const chevronVari  = varoitus ? '#b45309' : '#9ca3af'
  const otsikkoVari  = varoitus ? '#92400e' : '#374151'
  const tilaVari     = tilaVihrea
    ? '#1D9E75'
    : (varoitus ? '#b45309' : '#9ca3af')

  return (
    <div style={{ borderRadius: '12px', border: ulkoraja, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setAuki(a => !a)}
        style={{
          width:          '100%',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            '8px',
          padding:        '14px 16px',
          background:     headerBg,
          border:         'none',
          cursor:         'pointer',
          textAlign:      'left',
          minHeight:      '48px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: chevronVari, lineHeight: 1 }}>
            {auki ? '▼' : '▶'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: otsikkoVari }}>
            {otsikko}
          </span>
        </span>
        <span style={{
          fontSize:   '12px',
          fontWeight: '500',
          color:      tilaVari,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {tila}
        </span>
      </button>

      {auki && (
        <div style={{
          padding:     '16px',
          borderTop:   varoitus ? '1px solid #fde68a' : '1px solid #e2e8f0',
          background:  varoitus ? '#fffef7' : 'white',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}
