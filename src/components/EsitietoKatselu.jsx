import { kipuVari } from '../utils/helpers'

const readonlyInput = {
  width: '100%',
  background: '#F8FAFC',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '14px',
  color: '#374151',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '500',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '4px',
}

function Kenttä({ label, children }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  )
}

function Osio({ otsikko, lapset }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '12px' }}>
      <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 12px' }}>{otsikko}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{lapset}</div>
    </div>
  )
}

export default function EsitietoKatselu({ esitiedot, onTallennaAsiakkaaksi, onSulje }) {
  const kipuV = kipuVari(esitiedot.kipuaste ?? 0)

  return (
    <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Otsikkorivi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '600', color: '#111827' }}>Esitiedot</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
            {new Date(esitiedot.luotu).toLocaleString('fi-FI')}
          </p>
        </div>
        <button onClick={onSulje} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
      </div>

      {/* Scrollattava sisältö */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        <Osio otsikko="Perustiedot" lapset={
          <>
            <Kenttä label="Nimi">
              <input readOnly value={esitiedot.nimi || ''} style={readonlyInput} />
            </Kenttä>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Kenttä label="Sähköposti">
                <input readOnly value={esitiedot.sahkoposti || ''} style={readonlyInput} />
              </Kenttä>
              <Kenttä label="Puhelin">
                <input readOnly value={esitiedot.puhelin || ''} style={readonlyInput} />
              </Kenttä>
            </div>
            <Kenttä label="Palvelu">
              <input readOnly value={esitiedot.palvelu || ''} style={readonlyInput} />
            </Kenttä>
          </>
        } />

        {esitiedot.hoitoon_syy && (
          <Osio otsikko="Hoitoon tulon syy" lapset={
            <textarea
              readOnly
              value={esitiedot.hoitoon_syy}
              rows={4}
              style={{ ...readonlyInput, resize: 'none', fontFamily: 'inherit', lineHeight: '1.5' }}
            />
          } />
        )}

        {(esitiedot.kipuaste ?? 0) > 0 && (
          <Osio otsikko="Kipuaste" lapset={
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
                border: `3px solid ${kipuV.kehys}`, background: kipuV.tausta,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', fontWeight: '700', color: kipuV.teksti,
              }}>
                {esitiedot.kipuaste}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: kipuV.teksti }}>VAS {esitiedot.kipuaste} / 10</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                  {esitiedot.kipuaste >= 7 ? 'Kova kipu' : esitiedot.kipuaste >= 4 ? 'Kohtalainen kipu' : 'Lievä kipu'}
                </p>
              </div>
              <div style={{ flex: 1, height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${esitiedot.kipuaste * 10}%`, height: '100%', background: kipuV.kehys, borderRadius: '4px', transition: 'width 0.3s' }} />
              </div>
            </div>
          } />
        )}

      </div>

      {/* Sticky toimintopalkki */}
      <div style={{ position: 'sticky', bottom: 0, padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: 'white', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onTallennaAsiakkaaksi(esitiedot)}
          style={{ flex: 1, padding: '10px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
        >
          Tallenna asiakkaaksi →
        </button>
        <button
          onClick={onSulje}
          style={{ padding: '10px 16px', background: 'transparent', color: '#6b7280', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
        >
          Sulje
        </button>
      </div>
    </div>
  )
}
