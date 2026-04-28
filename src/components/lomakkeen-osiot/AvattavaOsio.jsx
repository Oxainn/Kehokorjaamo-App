import { useState } from 'react'

export default function AvattavaOsio({ otsikko, tila, tilaVihrea, children }) {
  const [auki, setAuki] = useState(false)

  return (
    <div style={{ borderRadius: '12px', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setAuki(a => !a)}
        style={{
          width:           '100%',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          gap:             '8px',
          padding:         '14px 16px',
          background:      auki ? '#f8fafc' : 'white',
          border:          'none',
          cursor:          'pointer',
          textAlign:       'left',
          minHeight:       '48px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1 }}>
            {auki ? '▼' : '▶'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
            {otsikko}
          </span>
        </span>
        <span style={{
          fontSize:   '12px',
          fontWeight: '500',
          color:      tilaVihrea ? '#1D9E75' : '#9ca3af',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {tila}
        </span>
      </button>

      {auki && (
        <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
          {children}
        </div>
      )}
    </div>
  )
}
